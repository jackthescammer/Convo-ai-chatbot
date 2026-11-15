/*
  Convo's spoken replies in the voice conversation: the browser's own speech synthesis
  (Web Speech API) with a Mandarin (zh-CN) voice. Nothing to install and no server, but the voice
  depends on the device:
  - Edge: Microsoft's natural voices (Xiaoxiao, Yunxi…), online.
  - Chrome: "Google 普通话（中国大陆）", online; on Windows also any Microsoft voices installed.
  - Safari (macOS, iOS): Tingting and friends, on the device.
  - Windows without a Chinese voice and some Linux setups have none: `speak` then fails with
    code 'no-voice' and the conversation shows Convo's words as text instead.
  CLAUDE.md Phase 3 asks for "a Mandarin TTS solution"; a server voice can replace this one by
  keeping speak()'s shape: speak(text, { rate, onStart }) -> { done: Promise<{ ok, code? }>, cancel }.
*/

export const ttsSupported = typeof window !== 'undefined'
  && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

// Voices that sound most natural, best first. Matched against the voice's name.
const PREFER = [/xiaoxiao/i, /natural/i, /yunxi|xiaoyi|yunjian/i, /google/i, /tingting|ting-ting/i, /meijia|lili|yu-shu/i, /huihui|yaoyao|kangkang/i];

const langOf = (v) => String(v.lang || '').replace('_', '-').toLowerCase();
const isMandarin = (v) => /^(zh-cn|zh-hans|cmn)/.test(langOf(v)) || /^zh-tw/.test(langOf(v)) || langOf(v) === 'zh';

function score(v) {
  const lang = langOf(v);
  let n = /^(zh-cn|zh-hans|cmn)/.test(lang) ? 100 : lang === 'zh' ? 60 : 20; // zh-TW is Mandarin too, but last
  const i = PREFER.findIndex((re) => re.test(v.name));
  if (i >= 0) n += 40 - i * 4;
  return n;
}

let voices = [];
function readVoices() {
  try { voices = speechSynthesis.getVoices() || []; } catch { voices = []; }
  return voices;
}

/** Resolves once the browser has listed its voices (Chrome lists them late), or after 2 s. */
function voicesLoaded() {
  if (!ttsSupported) return Promise.resolve([]);
  if (readVoices().length) return Promise.resolve(voices);
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      speechSynthesis.removeEventListener?.('voiceschanged', done);
      resolve(readVoices());
    };
    const timer = setTimeout(done, 2000);
    speechSynthesis.addEventListener?.('voiceschanged', done);
  });
}

/** The best Mandarin voice on this device, or null. */
export async function mandarinVoice() {
  const list = (await voicesLoaded()).filter(isMandarin);
  return list.sort((a, b) => score(b) - score(a))[0] || null;
}

/** Slower for easier conversations. */
export const RATE = { easy: 0.8, standard: 0.9, challenging: 1 };

/** Roughly how long a line takes to say, in seconds (for the bubble, before it has been played). */
export function estimateDuration(text, rate = 1) {
  const s = String(text || '');
  const han = (s.match(/[㐀-鿿]/g) || []).length;
  const words = (s.match(/[A-Za-z0-9]+/g) || []).length;
  const pauses = (s.match(/[，。！？、,.!?；;：:]/g) || []).length;
  return Math.max(0.8, (han * 0.24 + words * 0.32 + pauses * 0.22 + 0.25) / rate);
}

/** Speech synthesis has to be started once from a tap (Safari, and Chrome on a fresh page). */
export function unlockSpeech() {
  if (!ttsSupported) return;
  try {
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch { /* nothing to unlock */ }
}

let current = null; // keeps the utterance referenced: Chrome drops events of collected utterances

/* ---------- Server voices (ElevenLabs through /api/tts) ----------
   Convo's characters speak with the female ("jenny") or male ("jin") ElevenLabs voice when the site's
   server has a key (api/tts.js says which voices those are). If the request fails (no key, no such
   function on this host, plan or quota, offline, a refused play) the browser voice above says the line
   instead, so a conversation never depends on it. A failure that will repeat stops further requests,
   and serverVoiceIssue() says why, so the voice conversation can tell the learner. */
const SPEAKER = { cafe: 'jin', shop: 'jin', restaurant: 'jenny', interview: 'jin', chat: 'jenny' };
let speaker = null;       // 'jenny' | 'jin' for the conversation on screen
let serverIssue = null;   // code of a failure that will repeat (no key, no function, plan, quota), so lines don't wait on it
const clips = new Map();  // `${voice}|${text}` -> object URL of the audio, so replays cost nothing

// Why the ElevenLabs voice isn't speaking, finished by "…, so Convo is using this browser's voice".
const ISSUES = {
  'paid-plan': 'The ElevenLabs account needs a paid plan for this voice',
  quota: "Convo's ElevenLabs voice has used up this month's credits",
  'bad-key': "ElevenLabs refused this site's key",
  'voice-missing': "ElevenLabs couldn't find this voice",
  'no-key': 'This copy of Convo has no ElevenLabs key',
  'no-server': 'This copy of Convo has no voice server (api/tts.js)',
  forbidden: "Convo's voice server only answers its own site",
};

/** Which character is speaking now (call when a conversation opens). */
export function setSpeaker(scenarioId) { speaker = SPEAKER[scenarioId] || null; }
export const speakerName = () => speaker;

/** Why the ElevenLabs voice has stopped for this visit, as a sentence without a full stop, or null. */
export const serverVoiceIssue = () => (serverIssue ? ISSUES[serverIssue] || "Convo's ElevenLabs voice isn't available" : null);

async function clipFor(voice, text) {
  const key = `${voice}|${text}`;
  if (clips.has(key)) return clips.get(key);
  const r = await fetch('/api/tts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice }),
  });
  if (!r.ok) {
    let info = null;
    try { info = await r.json(); } catch { /* a host without the function answers with a page */ }
    // No JSON on 404 / 405 / 501: this host has no voice function (a static server, an old deploy).
    const code = info?.code || ([404, 405, 501].includes(r.status) ? 'no-server' : 'failed');
    throw Object.assign(new Error('tts'), { status: r.status, code, lasting: Boolean(info?.lasting) || code === 'no-server' });
  }
  const url = URL.createObjectURL(await r.blob());
  clips.set(key, url);
  if (clips.size > 40) { const [old] = clips.keys(); URL.revokeObjectURL(clips.get(old)); clips.delete(old); }
  return url;
}

function speakServer(text, voice, { rate = 1, onStart } = {}) {
  let finish;
  const done = new Promise((resolve) => { finish = resolve; });
  let settled = false;
  let audio = null;
  let started = 0;
  const me = {
    finish(result) {
      if (settled) return;
      settled = true;
      try { audio?.pause(); } catch { /* ignore */ }
      if (current === me) current = null;
      finish({ ...result, seconds: started ? (performance.now() - started) / 1000 : 0 });
    },
  };
  current = me;
  clipFor(voice, text).then((url) => {
    if (settled) return;
    audio = new Audio(url);
    audio.playbackRate = Math.min(1.1, Math.max(0.7, rate));
    audio.onplaying = () => { if (!started) { started = performance.now(); onStart?.(); } };
    audio.onended = () => me.finish({ ok: true });
    audio.onerror = () => me.finish({ ok: false, code: 'server-unavailable' });
    return audio.play();
  }).catch((err) => {
    // No function, key, plan or credits: stop asking. Busy, a network blip or a refused play: ask again next time.
    if (err?.lasting) serverIssue = err.code;
    me.finish({ ok: false, code: 'server-unavailable' });
  });
  return { done, cancel: () => me.finish({ ok: false, code: 'cancelled' }) };
}

/**
 * Speak one Mandarin line: in the character's ElevenLabs voice when there is one, else the browser's.
 * @returns {{ done: Promise<{ ok: boolean, code?: string, seconds?: number }>, cancel: () => void }}
 */
export function speak(text, opts = {}) {
  if (!speaker || serverIssue) return speakBrowser(text, opts);
  stopSpeaking();
  let inner = speakServer(text, speaker, opts);
  let cancelled = false;
  const done = inner.done.then((r) => {
    if (r.code === 'server-unavailable' && !cancelled) {
      inner = speakBrowser(text, opts);
      return inner.done;
    }
    return r;
  });
  return { done, cancel: () => { cancelled = true; inner.cancel(); } };
}

export function stopSpeaking() {
  const c = current;
  current = null;
  c?.finish({ ok: false, code: 'cancelled' });
  try { speechSynthesis.cancel(); } catch { /* ignore */ }
}

/**
 * Speak one Mandarin line.
 * @returns {{ done: Promise<{ ok: boolean, code?: string, seconds?: number }>, cancel: () => void }}
 */
function speakBrowser(text, { rate = 1, onStart } = {}) {
  let finish;
  const done = new Promise((resolve) => { finish = resolve; });
  if (!ttsSupported) {
    finish({ ok: false, code: 'unsupported' });
    return { done, cancel() {} };
  }
  stopSpeaking();

  let settled = false;
  let started = 0;
  let safety = 0;
  const me = {
    finish(result) {
      if (settled) return;
      settled = true;
      clearTimeout(safety);
      if (current === me) current = null;
      finish({ ...result, seconds: started ? (performance.now() - started) / 1000 : 0 });
    },
  };
  current = me;

  mandarinVoice().then((voice) => {
    if (settled) return;
    if (!voice) { me.finish({ ok: false, code: 'no-voice' }); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang || 'zh-CN';
    u.rate = rate;
    u.onstart = () => {
      if (settled) return;
      started = performance.now();
      onStart?.();
    };
    u.onend = () => me.finish({ ok: true });
    u.onerror = (e) => me.finish({ ok: false, code: e.error || 'error' });
    me.utterance = u;
    try {
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
      // Chrome can fail to fire onend at all; don't let the conversation hang on it.
      safety = setTimeout(() => me.finish({ ok: true, code: 'timeout' }), (estimateDuration(text, rate) * 2.5 + 6) * 1000);
    } catch {
      me.finish({ ok: false, code: 'error' });
    }
  });

  return {
    done,
    cancel: () => {
      if (current === me) stopSpeaking();
      else me.finish({ ok: false, code: 'cancelled' });
    },
  };
}
