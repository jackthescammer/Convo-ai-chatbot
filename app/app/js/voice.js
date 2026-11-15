/*
  The voice conversation (#/voice): talking to Convo with voice messages, hands-free.

  Turn by turn:
  1. Convo's reply arrives as a voice message and plays by itself (voice-tts.js).
  2. When it finishes, the microphone opens on its own: the orb lights up and its bars follow the
     learner's voice.
  3. When they stop talking (no voice and no new words for a moment; longer on Easy), a ring fills
     around the orb and the message sends itself as a voice message. "Send" sends at once, "Redo"
     throws the take away and listens again.
  Words come from speech.js (the browser's recogniser); loudness and the recording come from
  voice-capture.js. Text is an optional layer: each voice message can show its words, and
  "Show text" in the bar shows them all.

  talk.js owns the conversation (session, model calls, rail, report); this file only adds the voice
  messages and the dock that replaces the reply box. The dock is driven through the same view calls
  as the text conversation: busy() while Convo is working, reply() when its line arrives, ready()
  when it's the learner's turn, finish() at the end.
*/

import { esc, el, layered, reduceMotion } from './ui.js';
import { voiceSupported, createDictation } from './speech.js';
import { ttsSupported, speak, stopSpeaking, estimateDuration, unlockSpeech, RATE } from './voice-tts.js';
import { captureSupported, openCapture, unlockAudio, barsFor } from './voice-capture.js';

/** Hands-free voice needs both recognition (speech.js) and a voice for Convo. */
export const voiceModeSupported = voiceSupported && ttsSupported;
export const VOICE_UNSUPPORTED = 'Voice conversations need speech recognition and a Mandarin voice, which this browser doesn\'t have. Try Chrome, Edge or Safari, or type instead.';

/** Unlocks audio from a tap (Safari needs it before Convo can speak on its own). */
export function unlockVoice() {
  unlockSpeech();
  unlockAudio();
}

// How long the learner can be quiet before their message sends itself. Learners pause mid-sentence,
// so easier conversations wait longer.
const SILENCE_MS = { easy: 1900, standard: 1500, challenging: 1200 };
const MAX_TAKE_MS = 30000; // one message can't run longer than this
const QUIET_LIMIT = 3;     // after this many silent listens in a row, the mic pauses itself

const svg = (body, extra = '') => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${extra}>${body}</svg>`;
const ICON = {
  mic: svg('<rect x="9" y="3" width="6" height="11.5" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>'),
  play: svg('<path d="M8 5.8v12.4a.8.8 0 0 0 1.2.7l9.6-6.2a.8.8 0 0 0 0-1.4L9.2 5.1A.8.8 0 0 0 8 5.8z" fill="currentColor"/>'),
  pause: svg('<rect x="7" y="5.5" width="3.4" height="13" rx="1" fill="currentColor"/><rect x="13.6" y="5.5" width="3.4" height="13" rx="1" fill="currentColor"/>'),
  skip: svg('<path d="M6 6.2v11.6a.7.7 0 0 0 1.1.6l8.2-5.8a.7.7 0 0 0 0-1.2L7.1 5.6a.7.7 0 0 0-1.1.6z" fill="currentColor"/><path d="M18.5 5.5v13"/>'),
  send: svg('<path d="M12 19V5M6 11l6-6 6 6"/>', ' stroke-width="2.4"'),
  redo: svg('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 3.8v4.6h4.6"/>'),
  dots: '<span class="vorb-dots" aria-hidden="true"><span></span><span></span><span></span></span>',
};

const fmt = (sec) => {
  const s = Math.max(1, Math.round(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const spokenLength = (sec) => {
  const s = Math.max(1, Math.round(sec || 0));
  return s < 60 ? `${s} second${s === 1 ? '' : 's'}` : `${Math.floor(s / 60)} min ${s % 60} s`;
};

/* A steady waveform for one of Convo's lines (synthesised speech has no recording to measure). */
function lineWave(text, count) {
  let h = 2166136261;
  for (const ch of String(text)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const raw = Array.from({ length: count }, () => 0.25 + rand() * 0.75);
  return raw.map((v, i) => {
    const smooth = (v * 2 + (raw[i - 1] ?? v) + (raw[i + 1] ?? v)) / 4;
    const edge = Math.min(1, (Math.min(i, count - 1 - i) + 1) / 3); // quieter at the ends
    return Math.round(Math.max(0.14, smooth * (0.55 + 0.45 * edge)) * 100) / 100;
  });
}

/* ---------- Playback: one voice message at a time ---------- */
let active = null; // { msg, stop }
const playbackListeners = new Set();
const notifyPlayback = (playing, auto) => playbackListeners.forEach((fn) => fn(playing, auto));
export const isPlaying = () => Boolean(active);
export function stopPlayback() {
  active?.stop();
  stopSpeaking();
}

/**
 * A voice message for the conversation log. Convo's lines play with the Mandarin voice; the
 * learner's play their own recording. `msg.play({ auto })` resolves when playback ends.
 */
export function voiceMessage(entry, { role, difficulty = 'standard', animate = false } = {}) {
  const ai = entry.who === 'ai';
  const rate = RATE[difficulty] || 1;
  const text = ai ? entry.line.zh : entry.text;
  const seconds = ai ? (entry.seconds || estimateDuration(text, rate)) : entry.duration;
  const wave = ai ? lineWave(text, barsFor(seconds)) : (entry.wave?.length ? entry.wave : lineWave(text, barsFor(seconds || 2)));
  const canPlay = ai || Boolean(entry.audio);

  const msg = el('div', `msg msg-${entry.who} vmsg${animate ? ' is-new' : ''}`);
  msg.append(el('p', 'msg-who', ai ? `Convo <span class="msg-role">as ${esc(role)}</span>` : 'You'));

  const bubble = el('div', 'bubble vbubble');
  const who = ai ? 'Convo\'s' : 'your';
  const btn = canPlay ? el('button', 'vplay', ICON.play) : el('span', 'vplay is-static', ICON.mic);
  if (canPlay) {
    btn.type = 'button';
    btn.setAttribute('aria-label', `Play ${who} voice message`);
  } else {
    btn.title = 'Only the words of this message were kept, not its sound.';
  }
  const waveEl = el('span', 'vwave', wave.map((v) => `<i style="--h:${v}"></i>`).join(''));
  waveEl.setAttribute('aria-hidden', 'true');
  const timeEl = el('span', 'vtime', seconds ? fmt(seconds) : '');
  timeEl.setAttribute('aria-hidden', 'true');
  const srLabel = el('span', 'sr-only', `Voice message${seconds ? `, ${spokenLength(seconds)}` : ''}.`);
  const row = el('div', 'vrow');
  row.append(btn, waveEl, timeEl, srLabel);
  // The words sit inside the bubble, under the player, so they read on any background.
  const textEl = el('div', 'vtext', ai ? layered(entry.line) : `<p class="plain"${/[㐀-鿿]/.test(text) ? ' lang="zh-Hans"' : ''}>${esc(text)}</p>`);
  bubble.append(row, textEl);
  msg.append(bubble);

  const textBtn = el('button', 'vtext-btn', 'Show text');
  textBtn.type = 'button';
  textBtn.setAttribute('aria-pressed', 'false');
  textBtn.addEventListener('click', () => {
    const on = msg.classList.toggle('show-text');
    textBtn.setAttribute('aria-pressed', String(on));
    textBtn.textContent = on ? 'Hide text' : 'Show text';
  });
  msg.append(textBtn);

  const bars = [...waveEl.children];
  const paint = (p) => {
    const n = Math.round(p * bars.length);
    bars.forEach((b, i) => b.classList.toggle('on', i < n));
  };
  const setPlaying = (on) => {
    msg.classList.toggle('is-playing', on);
    if (!canPlay) return;
    btn.innerHTML = on ? ICON.pause : ICON.play;
    btn.setAttribute('aria-label', `${on ? 'Stop' : 'Play'} ${who} voice message`);
  };

  msg.play = ({ auto = false } = {}) => new Promise((resolve) => {
    if (!canPlay) { resolve({ ok: false, code: 'no-audio' }); return; }
    if (active?.msg === msg) { stopPlayback(); resolve({ ok: false, code: 'cancelled' }); return; }
    stopPlayback();
    let raf = 0;
    let ended = false;
    const end = (result) => {
      if (ended) return;
      ended = true;
      cancelAnimationFrame(raf);
      setPlaying(false);
      paint(0);
      if (active?.msg === msg) active = null;
      notifyPlayback(false, auto);
      resolve(result);
    };
    setPlaying(true);
    if (ai) {
      entry.spoken = true;
      const est = estimateDuration(text, rate);
      let t0 = 0;
      const tick = () => {
        paint(Math.min(0.97, (performance.now() - t0) / 1000 / est));
        raf = requestAnimationFrame(tick);
      };
      const handle = speak(text, { rate, onStart: () => { t0 = performance.now(); tick(); } });
      active = { msg, stop: () => { handle.cancel(); end({ ok: false, code: 'cancelled' }); } };
      handle.done.then((r) => {
        if (r.ok && r.code !== 'timeout' && r.seconds > 0.4) {
          entry.seconds = r.seconds;
          timeEl.textContent = fmt(r.seconds);
          srLabel.textContent = `Voice message, ${spokenLength(r.seconds)}.`;
        }
        if (r.ok) paint(1);
        end(r);
      });
    } else {
      const audio = new Audio(entry.audio);
      const tick = () => {
        const d = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : entry.duration || 1;
        paint(Math.min(1, audio.currentTime / d));
        raf = requestAnimationFrame(tick);
      };
      active = { msg, stop: () => { audio.pause(); end({ ok: false, code: 'cancelled' }); } };
      audio.onended = () => end({ ok: true });
      audio.onerror = () => end({ ok: false, code: 'error' });
      audio.play().then(tick, () => end({ ok: false, code: 'not-allowed' }));
    }
    notifyPlayback(true, auto);
  });

  if (canPlay) btn.addEventListener('click', () => { unlockVoice(); msg.play(); });
  return msg;
}

/* ---------- The dock: replaces the reply box in the voice conversation ---------- */
export const voiceDockHTML = () => `
  <div class="vdock" data-vdock data-state="idle">
    <p class="vdock-note" data-v-note hidden></p>
    <p class="vdock-live" data-v-live lang="zh-Hans" aria-hidden="true"></p>
    <div class="vdock-row">
      <button type="button" class="vdock-side" data-v-redo hidden>${ICON.redo}<span>Redo</span></button>
      <button type="button" class="vorb" data-v-orb aria-describedby="vdock-status">
        <svg class="vorb-ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle cx="50" cy="50" r="47" pathLength="100"/></svg>
        <span class="vorb-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
        <span class="vorb-icon" data-v-icon aria-hidden="true"></span>
      </button>
      <button type="button" class="vdock-side" data-v-send hidden>${ICON.send}<span>Send</span></button>
    </div>
    <p class="vdock-status" id="vdock-status" data-v-status role="status"></p>
  </div>`;

const STATES = {
  idle: { text: 'Getting ready', label: 'Voice conversation', icon: 'mic', disabled: true },
  gate: { text: 'Tap the mic to start talking. Convo speaks, then it\'s your turn.', label: 'Start the voice conversation', icon: 'mic' },
  speaking: { text: 'Convo is speaking. Tap to skip.', label: 'Skip Convo\'s message', icon: 'skip' },
  thinking: { text: 'Convo is thinking', label: 'Convo is thinking', icon: 'dots', disabled: true },
  listening: { text: 'Your turn. Speak in Mandarin.', label: 'Pause the microphone', icon: 'mic' },
  hearing: { text: 'Listening. Stop talking and it sends.', label: 'Send now', icon: 'send' },
  sending: { text: 'Sending', label: 'Sending', icon: 'send', disabled: true },
  waiting: { text: 'Playing a message. Your turn after it.', label: 'Start listening', icon: 'mic' },
  paused: { text: 'Paused. Tap the mic when you\'re ready.', label: 'Start listening', icon: 'mic' },
  error: { text: '', label: 'Try listening again', icon: 'mic' },
  done: { text: '', label: 'Conversation finished', icon: 'mic', disabled: true },
};
const BAR_SHAPE = [0.55, 0.85, 1, 0.8, 0.6];
const BAR_REST = [0.36, 0.62, 0.86, 0.6, 0.38]; // at rest the bars still read as a voice symbol

/**
 * @param {HTMLElement} dock  the [data-vdock] element
 * @param {object} o
 * @param {string} o.difficulty
 * @param {() => boolean} o.canListen   the learner's turn (nothing pending, no error, not ended)
 * @param {(text: string, extra: object) => boolean} o.onSend
 * @param {(state: string, label?: string) => void} o.mood
 * @param {() => void} [o.onNoVoice]   no Mandarin voice on this device: show Convo's words instead
 */
export function createVoiceDock(dock, { difficulty = 'standard', canListen, onSend, mood, onNoVoice }) {
  const q = (sel) => dock.querySelector(sel);
  const orb = q('[data-v-orb]');
  const icon = q('[data-v-icon]');
  const ring = q('.vorb-ring circle');
  const orbBars = [...q('.vorb-bars').children];
  const status = q('[data-v-status]');
  const live = q('[data-v-live]');
  const note = q('[data-v-note]');
  const redoBtn = q('[data-v-redo]');
  const sendBtn = q('[data-v-send]');
  const silenceMs = SILENCE_MS[difficulty] || SILENCE_MS.standard;

  let state = 'idle';
  // Speech synthesis and the microphone need a tap on a freshly loaded page.
  let unlocked = navigator.userActivation ? navigator.userActivation.hasBeenActive : false;
  let queued = null;      // Convo's newest line, waiting to be spoken: { entry, msg }
  let cap = null;
  let capOk = captureSupported;
  let heard = '';
  let firstTextAt = 0;
  let lastTextAt = 0;
  let listenStart = 0;
  let quietEnds = 0;
  let token = 0;
  let timer = 0;
  let raf = 0;
  let finalizeTimer = 0;
  let suspended = false;  // listening stopped for a replay; resumes when it ends
  let finishing = false;
  let destroyed = false;
  let retryFn = null;     // set while Convo's reply failed: the orb tries again

  function set(next, text) {
    const def = STATES[next];
    if (next !== 'error') retryFn = null;
    state = next;
    dock.dataset.state = next;
    status.textContent = text ?? def.text;
    status.dataset.tone = next === 'error' ? 'error' : '';
    orb.setAttribute('aria-label', next === 'error' && retryFn ? 'Try again' : def.label);
    orb.disabled = Boolean(def.disabled);
    if (icon.dataset.icon !== def.icon) {
      icon.dataset.icon = def.icon;
      icon.innerHTML = ICON[def.icon];
    }
    const take = next === 'hearing';
    redoBtn.hidden = !take;
    sendBtn.hidden = !take;
    if (next !== 'listening' && next !== 'hearing' && next !== 'sending') { setRing(0); live.textContent = ''; }
    if (next !== 'listening' && next !== 'hearing') drawBars(0);
  }

  function setRing(p) {
    ring.style.strokeDashoffset = String(100 - Math.round(p * 1000) / 10);
    dock.toggleAttribute('data-counting', p > 0);
  }

  function drawBars(level, t = 0) {
    orbBars.forEach((b, i) => {
      const wobble = reduceMotion.matches ? 1 : 0.72 + 0.28 * Math.sin(t / 110 + i * 1.9);
      const h = BAR_REST[i] * 0.5 + Math.min(1, level * 1.7) * BAR_SHAPE[i] * wobble * 0.55;
      b.style.setProperty('--l', h.toFixed(3));
    });
  }

  function closeCap() {
    const c = cap;
    cap = null;
    c?.close();
  }

  /* --- the recogniser: words, and when it stops by itself --- */
  const dict = createDictation({
    onText(text) {
      if (state !== 'listening' && state !== 'hearing' && state !== 'sending') return;
      const now = performance.now();
      if (!heard.trim() && text.trim()) firstTextAt = now;
      heard = text;
      lastTextAt = now;
      live.textContent = text;
      if (state === 'listening' && text.trim()) {
        quietEnds = 0;
        set('hearing');
      }
    },
    onState(on) {
      if (on || destroyed) return;
      if (state === 'sending') { finalize(); return; }
      if (state !== 'listening' && state !== 'hearing') return; // we stopped it on purpose
      // It stopped by itself: after a pause on Android, after a long silence elsewhere.
      if (heard.trim()) { endTurn(); return; }
      closeCap();
      quietEnds += 1;
      if (quietEnds >= QUIET_LIMIT) {
        set('paused', 'Paused because it went quiet. Tap the mic when you\'re ready.');
        mood('talking', 'Waiting for you');
        return;
      }
      listen();
    },
    onError(message, code) {
      if (code === 'no-speech') return; // the end follows and counts as a quiet listen
      if (code === 'audio-capture' && cap) {
        // This browser can't record and recognise at once: keep recognising, stop recording.
        closeCap();
        capOk = false;
        return;
      }
      if (state !== 'listening' && state !== 'hearing' && state !== 'sending') return;
      closeCap();
      clearInterval(timer);
      set('error', message);
      mood('talking', 'Waiting for you');
    },
  });

  /* --- listening --- */
  async function listen() {
    if (destroyed || finishing || !canListen()) return;
    if (isPlaying()) { suspended = true; set('waiting'); return; }
    if (document.hidden) { set('paused'); return; }
    const mine = ++token;
    heard = '';
    firstTextAt = 0;
    lastTextAt = 0;
    listenStart = performance.now();
    set('listening');
    mood('listening', 'Listening');
    dict.start();
    if (!dict.listening) return; // it reported why through onError
    if (capOk) {
      try {
        const c = await openCapture();
        if (mine !== token || (state !== 'listening' && state !== 'hearing')) c.close();
        else cap = c;
      } catch (err) {
        // Blocked mic: the recogniser reports it. Anything else: carry on without recording.
        if (err?.name !== 'NotAllowedError') capOk = false;
      }
    }
    if (mine !== token) return;
    clearInterval(timer);
    timer = setInterval(check, 60);
    if (!raf) raf = requestAnimationFrame(frame);
  }

  // When has the learner finished? No voice (from the mic) and no new words (from the recogniser)
  // for `silenceMs`. Without the mic's level, only the words count, with a little more patience.
  function check() {
    if (state !== 'listening' && state !== 'hearing') { clearInterval(timer); return; }
    const now = performance.now();
    if (now - listenStart > MAX_TAKE_MS && heard.trim()) { endTurn(); return; }
    if (!heard.trim()) { setRing(0); return; }
    const level = cap?.live;
    const sinceWords = now - lastTextAt;
    let quiet;
    let wait;
    if (level) {
      quiet = cap.voiced ? 0 : now - Math.max(lastTextAt, cap.lastVoiceAt);
      wait = silenceMs;
      // A noisy room can keep the level up after the words have stopped.
      if (sinceWords > silenceMs + 2500) quiet = wait;
    } else {
      quiet = sinceWords;
      wait = silenceMs + 300;
    }
    setRing(Math.min(1, Math.max(0, (quiet - 250) / (wait - 250))));
    if (quiet >= wait) endTurn();
  }

  function frame(t) {
    raf = 0;
    if (destroyed || (state !== 'listening' && state !== 'hearing')) return;
    let level = 0;
    if (cap?.live) level = cap.level;
    else if (heard && performance.now() - lastTextAt < 350) level = 0.45; // no meter: pulse on new words
    drawBars(level, t);
    raf = requestAnimationFrame(frame);
  }

  function endTurn() {
    if (state !== 'listening' && state !== 'hearing') return;
    clearInterval(timer);
    set('sending');
    setRing(1);
    clearTimeout(finalizeTimer);
    finalizeTimer = setTimeout(finalize, 1800); // in case the recogniser never says it ended
    if (dict.listening) dict.stop(); // the last words arrive, then onState(false) -> finalize
    else finalize();
  }

  async function finalize() {
    if (state !== 'sending') return;
    clearTimeout(finalizeTimer);
    const text = heard.trim();
    set('thinking', 'Sending');
    dict.abort();
    const c = cap;
    cap = null;
    c?.close();
    let take = null;
    try { take = c ? await c.take() : null; } catch (err) { console.warn('Voice message could not be saved:', err); }
    if (destroyed) { if (take) URL.revokeObjectURL(take.url); return; }
    if (!text) { listen(); return; }
    const extra = take
      ? { spoken: true, audio: take.url, duration: take.duration, wave: take.wave }
      : { spoken: true, duration: Math.max(1, (lastTextAt - firstTextAt) / 1000 + 0.8) };
    if (!onSend(text, extra)) {
      if (take) URL.revokeObjectURL(take.url);
      set('paused');
    }
  }

  function pause(text) {
    token += 1;
    clearInterval(timer);
    set('paused', text);
    mood('talking', 'Waiting for you');
    dict.abort();
    closeCap();
  }

  /* --- Convo's turn --- */
  async function speakQueued() {
    const item = queued;
    queued = null;
    set('speaking');
    mood('talking', 'Speaking');
    const r = await item.msg.play({ auto: true });
    if (destroyed) return false;
    if (r.code === 'not-allowed') {
      // The browser wants a tap first: wait for one, then say it.
      unlocked = false;
      queued = item;
      set('gate', 'Tap the mic to hear Convo and start talking.');
      return false;
    }
    if (r.code === 'no-voice') {
      note.hidden = false;
      note.textContent = 'This device has no Mandarin voice, so Convo\'s replies show as text. You can still answer by speaking.';
      onNoVoice?.();
    }
    return true;
  }

  async function ready() {
    if (destroyed || finishing || !canListen()) return;
    if (!unlocked) { set('gate'); return; }
    if (queued && !(await speakQueued())) return;
    if (finishing) { set('done'); return; }
    listen();
  }

  /* --- controls --- */
  orb.addEventListener('click', () => {
    unlockVoice();
    switch (state) {
      case 'gate': unlocked = true; quietEnds = 0; ready(); break;
      case 'speaking': stopPlayback(); break; // speakQueued resolves and listening starts
      case 'listening': pause(); break;
      case 'hearing': endTurn(); break;
      case 'waiting': stopPlayback(); break;
      case 'error':
        if (retryFn) { const retry = retryFn; retryFn = null; unlocked = true; retry(); break; }
      // falls through: a microphone error is retried by listening again
      case 'paused': unlocked = true; quietEnds = 0; ready(); break;
      default: break;
    }
  });
  redoBtn.addEventListener('click', () => {
    pause();
    listen();
  });
  sendBtn.addEventListener('click', () => endTurn());

  // A replay pauses listening (the mic would hear it); listening comes back when it ends.
  const onPlayback = (playing, auto) => {
    if (auto || destroyed) return;
    if (playing && (state === 'listening' || state === 'hearing')) {
      pause();
      suspended = true;
      set('waiting');
    } else if (!playing && suspended) {
      suspended = false;
      if (state === 'waiting') ready();
    }
  };
  playbackListeners.add(onPlayback);

  // Leaving the tab closes the mic.
  const onVisibility = () => {
    if (document.hidden && (state === 'listening' || state === 'hearing')) pause('Paused while you were away. Tap the mic to carry on.');
  };
  document.addEventListener('visibilitychange', onVisibility);

  set('idle');

  return {
    /** Convo's new line: it's spoken at the next ready(). */
    reply(entry, msg) { queued = { entry, msg }; },
    /** The learner said something (typed in the other mode): nothing of Convo's is waiting. */
    clearQueue() { queued = null; },
    busy() {
      if (state === 'listening' || state === 'hearing') pause();
      token += 1;
      clearInterval(timer);
      set('thinking');
    },
    ready,
    /** Convo couldn't reply: the orb offers `retry` instead of the microphone. */
    error(text, retry) {
      token += 1;
      clearInterval(timer);
      dict.abort();
      closeCap();
      retryFn = retry || null;
      set('error', text);
    },
    /** `say`: Convo's closing line (if it ended the conversation) is still said. */
    async finish({ say = true } = {}) {
      finishing = true;
      token += 1;
      clearInterval(timer);
      dict.abort();
      closeCap();
      if (state === 'speaking' || state === 'waiting') stopPlayback(); // ended early: stop mid-line
      if (say && queued && unlocked) await speakQueued();
      queued = null;
      if (!destroyed) set('done');
    },
    destroy() {
      destroyed = true;
      token += 1;
      clearInterval(timer);
      clearTimeout(finalizeTimer);
      cancelAnimationFrame(raf);
      playbackListeners.delete(onPlayback);
      document.removeEventListener('visibilitychange', onVisibility);
      dict.abort();
      closeCap();
      stopPlayback();
    },
  };
}
