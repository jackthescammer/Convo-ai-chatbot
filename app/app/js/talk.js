import {
  esc, el, layered, wait, setMood, poke, reduceMotion, bindLayerToggles, layerChips, ICONS,
} from './ui.js';
import { mountMascots } from './kit.js';
import { getPrefs, savePrefs } from './prefs.js';
import { model, MODEL_INFO, SCENARIOS, scenarioById, validateTurn, validateReport } from './model.js';
import { getSettings, addReport } from './store.js';
import { awardReport } from './wallet.js';
import { voiceSupported, createDictation } from './speech.js';

const CJK = /[㐀-鿿]/;
const ARROW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const MIC = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11.5" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/></svg>';
// Windows has its own voice typing (Win + H). It types into the reply box like a keyboard, in the
// language of the current Windows keyboard, so the keyboard has to be Chinese first (Win + Space).
// A web page can't start it; we can only say it's there.
const ON_WINDOWS = /Windows/i.test(navigator.userAgent);
const WIN_VOICE_TIP = 'To speak with Windows voice typing: switch the keyboard to Chinese (Win + Space), click the reply box, then press Win + H.';
const LISTENING = 'Listening for Mandarin. Tap the mic again when you\'re done.';
// Spoken text joins what's already typed; a space only goes between two Latin words.
const joinText = (a, b) => (/[A-Za-z0-9]$/.test(a) && /^[A-Za-z0-9]/.test(b) ? `${a} ${b}` : a + b);
const STATUS = {
  idle: 'Getting ready',
  listening: 'Listening',
  thinking: 'Reading your message',
  chatting: 'Typing a reply',
  talking: 'Waiting for you',
  surprised: 'Waiting for you',
  happy: 'Waiting for you',
  celebrate: 'Conversation finished',
  wave: 'Conversation finished',
};

/* ---------- Session: survives leaving the screen, so a conversation can be resumed ---------- */
let session = null;

function newSession(scenario) {
  const s = getSettings();
  savePrefs({ scenario }); // the dashboard offers this one first next time
  return {
    id: `c${Date.now().toString(36)}`,
    settings: { level: s.level, difficulty: s.difficulty, scenario },
    history: [],      // { who: 'ai', line, mood } | { who: 'you', text, notes }
    notes: [],
    goals: {},
    suggestions: [],
    ended: false,
    pending: false,
    error: null,
    reportId: null,
    view: null,
  };
}

export const hasActiveSession = () => Boolean(session && !session.ended && session.history.some((h) => h.who === 'you'));
export const sessionProgress = () => ({ goals: { ...(session?.goals || {}) } });
/** The conversation #/talk opens: the one in progress, else the one started last. */
export const currentScenario = () => scenarioById(hasActiveSession() ? session.settings.scenario : getPrefs().scenario);
export function resetSession() {
  if (session) session.view = null;
  session = null;
}

const toModelHistory = (s) => s.history.map((h) => ({ who: h.who, zh: h.who === 'ai' ? h.line.zh : h.text }));

/* ---------- Model calls ---------- */
async function runModel(s, kind) {
  s.pending = true;
  s.error = null;
  s.view?.busy();
  try {
    if (kind === 'reply') {
      s.view?.mood('thinking');
      await wait(450);
    }
    s.view?.mood('chatting');
    s.view?.typing(true);
    const learner = kind === 'reply' ? [...s.history].reverse().find((h) => h.who === 'you') : null;
    const raw = kind === 'start'
      ? await model.start({ settings: s.settings })
      : await model.reply({ history: toModelHistory(s), settings: s.settings });
    const turn = validateTurn(raw, s.settings.scenario);
    await applyTurn(s, turn);
    // after the reply, so the check doesn't slow the conversation down (one GPU does both)
    if (learner && !learner.check) liveCheck(s, learner);
  } catch (err) {
    console.warn('Convo model call failed:', err);
    s.pending = false;
    s.error = { kind, message: err?.message || 'Something went wrong.' };
    s.view?.typing(false);
    s.view?.showError();
  }
}

async function applyTurn(s, turn) {
  const learner = [...s.history].reverse().find((h) => h.who === 'you');
  if (learner && turn.notes.length) learner.notes = turn.notes;
  s.notes.push(...turn.notes);
  Object.entries(turn.goals).forEach(([id, done]) => { if (done) s.goals[id] = true; });
  s.suggestions = turn.suggestions;
  s.history.push({ who: 'ai', line: turn.reply, mood: turn.mood });
  if (turn.ended) s.ended = true;

  // Stays pending until the reply is on screen, so nothing can be sent in between.
  const v = s.view;
  if (!v) { s.pending = false; return; }
  v.typing(false);
  // Notes land in the rail first (Convo noting quietly), then the reply arrives.
  for (const note of turn.notes) {
    v.addNote(note, true);
    await wait(380);
  }
  v.addMessage(s.history[s.history.length - 1], true);
  v.goals(true);
  v.mood(turn.mood);
  if (turn.mood === 'surprised') v.poke('shake');
  v.suggestions();
  s.pending = false;
  if (s.ended) v.finish(true);
  else v.ready();
}

/* ---------- Live feedback: each message is checked after Convo answers ---------- */
const LIVE_CHECKS = MODEL_INFO.connected && typeof model.check === 'function';

async function liveCheck(s, entry) {
  if (!LIVE_CHECKS) return;
  entry.check = { pending: true };
  s.view?.renderCheck(entry, true);
  try {
    entry.check = (await model.check({ text: entry.text, settings: s.settings })) || { valid: false };
  } catch (err) {
    console.warn('Live check failed:', err);
    entry.check = { failed: err?.message || 'Something went wrong.' };
  }
  s.view?.renderCheck(entry, false);
}

function send(s, text) {
  const clean = text.trim();
  if (!clean || s.pending || s.ended) return false;
  const entry = { who: 'you', id: `m${Date.now().toString(36)}`, text: clean, notes: [] };
  s.history.push(entry);
  s.view?.addMessage(entry, true);
  runModel(s, 'reply');
  return true;
}

function endEarly(s) {
  if (s.ended) return;
  s.ended = true;
  s.view?.finish(true);
}

async function writeReport(s) {
  const raw = await model.report({ history: toModelHistory(s), notes: s.notes, settings: s.settings });
  const r = validateReport(raw);
  const sc = scenarioById(s.settings.scenario);
  const report = {
    id: `r${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    scenario: sc.title,
    scenarioId: sc.id,
    level: s.settings.level,
    difficulty: s.settings.difficulty,
    model: MODEL_INFO.name,
    placeholder: !MODEL_INFO.connected,
    // Only a model that reports goals gets them in the report (none are guessed).
    goals: MODEL_INFO.provides.goals ? sc.goals.map((g) => ({ label: g.label, done: Boolean(s.goals[g.id]) })) : [],
    transcript: s.history.map((h) => (h.who === 'ai' ? { who: 'ai', ...h.line } : { who: 'you', zh: h.text })),
    notes: s.notes,
    ...r,
  };
  addReport(report);
  awardReport(report); // coins for a finished conversation, once per report
  s.reportId = report.id;
  return report.id;
}

/* ---------- Screen ---------- */
const DIFF = { easy: 'Easy', standard: 'Standard', challenging: 'Challenging' };
// The live model's name is filled in once its server answers, so this is re-read after each reply.
const railFoot = () => (MODEL_INFO.connected ? `Replies by ${MODEL_INFO.name}.` : MODEL_INFO.detail);

function template(s) {
  const sc = scenarioById(s.settings.scenario);
  const meta = `${s.settings.level} · ${DIFF[s.settings.difficulty]}`;
  return `
  <section class="talk" aria-labelledby="talk-title">
    <div class="talk-stage" data-stage>
      <div class="talk-bar" data-hint-scope>
        <span class="talk-bar-mascot" data-mascot="idle" data-size="44" data-barista-mini></span>
        <div class="talk-heading">
          <h1 class="talk-title" id="talk-title">${esc(sc.title)}</h1>
          <p class="talk-sub">${esc(meta)}</p>
        </div>
        <div class="talk-controls">
          ${layerChips('Show in conversation')}
          <button type="button" class="btn-quiet notes-btn" data-rail-toggle aria-expanded="false" aria-controls="talk-rail">
            ${ICONS.notes}<span>Notes</span><span class="count" data-note-count${MODEL_INFO.provides.notes ? '' : ' hidden'}>0</span>
          </button>
        </div>
        <div class="talk-end">
          <button type="button" class="btn-quiet" data-end><span class="hide-sm">End conversation</span><span class="show-sm">End</span></button>
          <button type="button" class="btn-quiet" data-restart hidden><span class="hide-sm">New conversation</span><span class="show-sm">New</span></button>
        </div>
        <p class="toggle-hint" data-toggle-hint aria-live="polite"></p>
      </div>

      <div class="talk-body">
        <div class="talk-chat${sc.image ? ' has-scene' : ''}">
          ${sc.image ? `<img class="chat-scene" src="${esc(sc.image)}" alt="" decoding="async">` : ''}
          <div class="chat-log" data-log role="log" aria-live="polite" aria-label="Conversation with Convo">
            <p class="chat-context">${esc(sc.context)}</p>
          </div>
          <div class="composer" data-composer>
            <div class="suggest" id="talk-suggest" data-suggest hidden>
              <p class="suggest-title" id="suggest-title">Try saying</p>
              <div class="suggest-list" role="group" aria-labelledby="suggest-title" data-suggest-list></div>
            </div>
            <form class="composer-row" data-form>
              <button type="button" class="help-btn" data-help aria-expanded="false" aria-controls="talk-suggest"${MODEL_INFO.provides.suggestions ? '' : ' hidden'}>
                ${ICONS.help}<span class="help-label">Help me reply</span>
              </button>
              <label class="sr-only" for="talk-input">Your reply</label>
              <textarea id="talk-input" class="composer-input" rows="1" data-input autocomplete="off" spellcheck="false"
                placeholder="${voiceSupported ? 'Reply in Mandarin, or tap the mic' : 'Reply in Mandarin'}" aria-describedby="talk-keys"></textarea>
              ${voiceSupported ? `<button type="button" class="mic-btn" data-mic aria-pressed="false" aria-label="Speak your reply" title="Speak your reply">${MIC}</button>` : ''}
              <button type="submit" class="send-btn" data-send aria-label="Send" disabled>${ICONS.send}</button>
            </form>
            <p class="voice-status" data-voice-status role="status" hidden></p>
            <p class="composer-keys" id="talk-keys">${getPrefs().enterToSend ? 'Enter sends. Shift + Enter starts a new line.' : 'Enter starts a new line. Use the send button to send.'}${ON_WINDOWS ? ` <span class="win-voice">${WIN_VOICE_TIP}</span>` : ''}</p>
          </div>
        </div>

        <aside class="talk-rail" id="talk-rail" data-rail aria-label="Goals and notes">
          <div class="barista">
            <span class="barista-mascot" data-mascot="idle" data-size="84" data-barista></span>
            <div class="barista-copy">
              <p class="barista-name">Convo <span class="msg-role">as ${esc(sc.role)}</span></p>
              <p class="barista-status" data-status>${STATUS.idle}</p>
            </div>
            <button type="button" class="rail-close" data-rail-close aria-label="Close notes">${ICONS.close}</button>
          </div>
          ${MODEL_INFO.provides.goals ? `<section class="rail-block" aria-labelledby="goals-title">
            <h2 class="rail-title" id="goals-title">Goals</h2>
            <ol class="goals" data-goals>
              ${sc.goals.map((g) => `<li class="goal" data-goal="${g.id}"><span class="goal-mark">${ICONS.check}</span><span class="goal-label">${esc(g.label)}</span><span class="sr-only" data-goal-state>, not done yet</span></li>`).join('')}
            </ol>
          </section>` : ''}
          ${MODEL_INFO.provides.notes ? `<section class="rail-block" aria-labelledby="notes-title">
            <h2 class="rail-title" id="notes-title">Saved for your report</h2>
            <ol class="notes" data-notes></ol>
            <p class="notes-hidden">Notes are hidden until your report. <a class="text-link" href="#/settings/conversation">Show them while I talk</a></p>
          </section>` : LIVE_CHECKS ? `<section class="rail-block" aria-labelledby="notes-title">
            <h2 class="rail-title" id="notes-title">Live feedback</h2>
            <p class="rail-note">After Convo replies, your message is checked here: what to fix and why. Pinyin is read as characters first. The full report comes when you end the conversation.</p>
            <ol class="checks" data-checks aria-live="polite"></ol>
            <ol class="notes" data-notes hidden></ol>
          </section>` : `<section class="rail-block" aria-labelledby="notes-title">
            <h2 class="rail-title" id="notes-title">Your report</h2>
            <p class="rail-note">Convo doesn't stop the conversation to correct you. When you end it, each sentence you wrote is checked, with a better version and why.</p>
            <ol class="notes" data-notes hidden></ol>
          </section>`}
          <p class="rail-foot" data-rail-foot>${esc(railFoot())}</p>
        </aside>
      </div>
    </div>
  </section>`;
}

/** #/talk resumes the conversation in progress (or starts the last one); #/talk/<scenario> opens that
    scenario, and starting a different one ends an unfinished conversation, as Start over does. */
export function render(root, arg) {
  const wanted = SCENARIOS.some((sc) => sc.id === arg) ? arg : null;
  if (!session || session.reportId || (wanted && session.settings.scenario !== wanted)) {
    session = newSession(wanted || currentScenario().id);
  }
  const s = session;
  const role = scenarioById(s.settings.scenario).role;
  document.title = `${scenarioById(s.settings.scenario).title} · Convo`;
  root.innerHTML = template(s);

  const q = (sel) => root.querySelector(sel);
  const stage = q('[data-stage]');
  const log = q('[data-log]');
  const notesEl = q('[data-notes]');
  const noteCount = q('[data-note-count]');
  const input = q('[data-input]');
  const form = q('[data-form]');
  const sendBtn = q('[data-send]');
  const helpBtn = q('[data-help]');
  const suggestEl = q('[data-suggest]');
  const suggestList = q('[data-suggest-list]');
  const statusEl = q('[data-status]');
  const composer = q('[data-composer]');
  const railToggle = q('[data-rail-toggle]');
  const micBtn = q('[data-mic]');
  const voiceStatus = q('[data-voice-status]');

  const mascots = mountMascots(root);
  const baristas = [mascots.get('[data-barista]'), mascots.get('[data-barista-mini]')];
  const unbindLayers = bindLayerToggles(root);

  const scrollLog = () => log.scrollTo({ top: log.scrollHeight, behavior: reduceMotion.matches ? 'auto' : 'smooth' });

  /* --- rendering pieces --- */
  function addMessage(entry, animate) {
    const msg = el('div', `msg msg-${entry.who}${animate ? ' is-new' : ''}`);
    if (entry.who === 'ai') {
      msg.append(el('p', 'msg-who', `Convo <span class="msg-role">as ${esc(role)}</span>`));
      const bubble = el('div', 'bubble', layered(entry.line));
      msg.append(bubble);
      if (entry.line.py || entry.line.en) {
        const reveal = el('button', 'reveal', 'Show all layers');
        reveal.type = 'button';
        reveal.setAttribute('aria-pressed', 'false');
        reveal.addEventListener('click', () => {
          const on = msg.classList.toggle('is-revealed');
          reveal.setAttribute('aria-pressed', String(on));
          reveal.textContent = on ? 'Hide extra layers' : 'Show all layers';
        });
        msg.append(reveal);
      }
    } else {
      msg.append(el('p', 'msg-who', 'You'));
      const p = el('p', 'plain', esc(entry.text));
      if (CJK.test(entry.text)) p.lang = 'zh-Hans';
      const bubble = el('div', 'bubble');
      bubble.append(p);
      msg.append(bubble);
    }
    log.append(msg);
    scrollLog();
  }

  function addNote(note, animate) {
    const li = el('li', `note${animate ? ' is-new' : ''}`);
    li.append(el('span', `tag tag-${note.tag}`, esc(note.label)));
    if (note.from && note.to) {
      li.append(el('p', 'note-change', `<span class="from" lang="zh-Hans">${esc(note.from)}</span>${ARROW}<span class="to" lang="zh-Hans">${esc(note.to)}</span>`));
    } else if (note.text) {
      li.append(el('p', 'note-text', esc(note.text)));
    }
    notesEl.append(li);
    noteCount.textContent = String(notesEl.children.length);
    if (note.tag === 'ok') poke(baristas[0], 'nod');
  }

  const checksEl = q('[data-checks]');
  const TAG_FOR = { vocabulary: ['vocab', 'Vocabulary'], unnatural: ['natural', 'More natural'] };
  function toneBlock(t) {
    if (!t || t.status === 'ok' || !t.expected) return '';
    const right = `<p class="check-py check-py-right">${esc(t.expected)}</p>`;
    let msg;
    if (t.status === 'none') msg = 'You left out the tone marks. Pinyin needs them, because the tone changes the meaning. With tones:';
    else if (t.status === 'check') msg = 'Check your tones against the right pinyin:';
    else {
      const bits = [];
      if (t.wrong?.length) bits.push(`${t.wrong.length} wrong`);
      if (t.missing) bits.push(`${t.missing} missing`);
      msg = `Some tones need fixing (${bits.join(', ')}). The right pinyin:`;
    }
    const wrong = (t.wrong || []).map((w) => `<li><span class="from">${esc(w.typed)}</span>${ARROW}<span class="to">${esc(w.expected)}</span> <span lang="zh-Hans">${esc(w.char)}</span></li>`).join('');
    return `<div class="check-part"><span class="tag tag-tone">Tones</span>
      <p class="check-why">${msg}</p>${right}${wrong ? `<ul class="check-tones">${wrong}</ul>` : ''}</div>`;
  }

  function renderCheck(entry, animate) {
    if (!checksEl || !entry.check) return;
    const c = entry.check;
    let li = checksEl.querySelector(`[data-check-for="${entry.id}"]`);
    if (!li) {
      li = el('li', `check${animate ? ' is-new' : ''}`);
      li.dataset.checkFor = entry.id;
      checksEl.prepend(li); // newest first, so it's visible without scrolling
    }
    const said = `<p class="check-said"><span class="check-you">You wrote</span> <span${CJK.test(entry.text) ? ' lang="zh-Hans"' : ''}>${esc(entry.text)}</span></p>`;
    const readAs = c.from_pinyin && c.checked
      ? `<p class="check-read">We read it as <span lang="zh-Hans">${esc(c.checked)}</span></p>` : '';
    const tones = toneBlock(c.tones);
    const goodJob = (text) => `<p class="check-good"><span class="check-good-mark">${ICONS.check}</span><strong>Good job!</strong> ${text}</p>`;
    let html;
    if (c.pending) html = said + '<p class="check-status"><span class="check-dots" aria-hidden="true"><span></span><span></span><span></span></span>Checking…</p>';
    else if (c.failed) html = said + `<p class="check-status">Couldn't check this one. ${esc(c.failed)}</p>`;
    else if (c.skipped) html = said + `<p class="check-status">${esc(c.skipped)}</p>`;
    else if (c.valid === false) html = said + '<p class="check-status">Couldn\'t check this one.</p>';
    else if (c.has_error && c.corrected) {
      const [tag, label] = TAG_FOR[c.category] || ['grammar', c.label ? c.label[0].toUpperCase() + c.label.slice(1) : 'Grammar'];
      html = said + readAs + `<div class="check-part"><span class="tag tag-${tag}">${esc(label)}</span>
        <p class="note-change"><span class="from" lang="zh-Hans">${esc(c.checked || entry.text)}</span>${ARROW}<span class="to" lang="zh-Hans">${esc(c.corrected)}</span></p>
        ${c.corrected_pinyin ? `<p class="check-py">${esc(c.corrected_pinyin)}</p>` : ''}
        ${c.explanation ? `<p class="check-why">${esc(c.explanation)}</p>` : ''}</div>` + tones;
    } else if (tones) {
      // right sentence, but the pinyin's tones need work
      html = goodJob('The sentence is right.') + readAs + tones;
    } else {
      html = goodJob("That's correct.");
    }
    li.innerHTML = html;
    if (!c.pending && c.has_error === false && !c.skipped) poke(baristas[0], 'nod');
  }

  function goals(animate) {
    root.querySelectorAll('[data-goal]').forEach((li) => {
      const done = Boolean(s.goals[li.dataset.goal]);
      if (done && !li.classList.contains('is-done') && animate) li.classList.add('just-done');
      li.classList.toggle('is-done', done);
      li.querySelector('[data-goal-state]').textContent = done ? ', done' : ', not done yet';
    });
  }

  function mood(state) {
    baristas.forEach((m) => setMood(m, state));
    statusEl.textContent = STATUS[state] || STATUS.talking;
  }

  let typingEl = null;
  function typing(on) {
    typingEl?.remove();
    typingEl = null;
    if (!on) return;
    typingEl = el('div', 'msg msg-ai is-new', '<div class="bubble typing"><span></span><span></span><span></span></div>');
    typingEl.setAttribute('aria-hidden', 'true');
    log.append(typingEl);
    scrollLog();
  }

  function suggestions() {
    suggestList.replaceChildren();
    s.suggestions.forEach((line) => {
      const b = el('button', 'suggestion', layered(line, { cls: 'layered layered-sm' }));
      b.type = 'button';
      b.addEventListener('click', () => {
        dictation?.abort();
        input.value = line.zh;
        syncInput();
        toggleHelp(false);
        input.focus();
      });
      suggestList.append(b);
    });
    helpBtn.disabled = !s.suggestions.length || s.ended;
    if (!s.suggestions.length) toggleHelp(false);
  }

  function toggleHelp(force) {
    const open = force ?? suggestEl.hidden;
    suggestEl.hidden = !open || !s.suggestions.length;
    helpBtn.setAttribute('aria-expanded', String(!suggestEl.hidden));
  }

  let errorEl = null;
  function showError() {
    errorEl?.remove();
    if (!s.error) return;
    errorEl = el('div', 'chat-error', `<p><strong>Convo couldn't reply.</strong> ${esc(s.error.message)}</p>`);
    const retry = el('button', 'btn-quiet btn-quiet-solid', 'Try again');
    retry.type = 'button';
    retry.addEventListener('click', () => {
      errorEl?.remove();
      errorEl = null;
      runModel(s, s.error.kind);
    });
    errorEl.append(retry);
    log.append(errorEl);
    scrollLog();
    mood('talking');
    statusEl.textContent = 'Couldn\'t reply';
    ready();
  }

  function busy() {
    sendBtn.disabled = true;
    toggleHelp(false);
    helpBtn.disabled = true;
  }

  function ready() {
    syncInput();
    helpBtn.disabled = !s.suggestions.length;
    const foot = q('[data-rail-foot]');
    if (foot) foot.textContent = railFoot();
  }

  function syncInput() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
    sendBtn.disabled = s.pending || s.ended || !input.value.trim();
  }

  /* --- voice input: speech fills the reply box, the learner checks it and sends --- */
  function showVoice(message, tone) {
    voiceStatus.textContent = message;
    voiceStatus.hidden = !message;
    voiceStatus.dataset.tone = tone || '';
    composer.toggleAttribute('data-voice', Boolean(message));
  }

  let voiceBase = '';
  const dictation = micBtn && createDictation({
    onState(on) {
      micBtn.setAttribute('aria-pressed', String(on));
      if (on) {
        voiceBase = input.value;
        showVoice(LISTENING);
        if (!s.pending && !s.ended) mood('listening');
      } else if (voiceStatus.dataset.tone !== 'error') {
        showVoice('');
        // Back to the box to check the words and send (not on touch screens, where it would open the keyboard).
        if (input.value && !s.ended && matchMedia('(pointer: fine)').matches) input.focus({ preventScroll: true });
      }
    },
    onText(text) {
      input.value = joinText(voiceBase, text.trim());
      syncInput();
      input.scrollTop = input.scrollHeight;
    },
    onError(message) { showVoice(message, 'error'); },
  });
  micBtn?.addEventListener('click', () => {
    if (!dictation.listening) showVoice('');
    dictation.toggle();
  });

  function finish(animate) {
    dictation?.abort();
    composer.hidden = true;
    q('[data-end]').hidden = true;
    q('[data-restart]').hidden = false;
    toggleHelp(false);
    const said = s.history.some((h) => h.who === 'you');
    log.append(el('p', `chat-end${animate ? ' msg is-new' : ''}`, 'Conversation finished'));
    const done = el('div', `chat-done${animate ? ' is-new' : ''}`);
    if (said) {
      done.innerHTML = `<p><strong>Your report is ready to write.</strong> It goes through what you said, with corrections and why.</p>
        <button type="button" class="btn btn-primary" data-report>Read your report</button>`;
    } else {
      done.innerHTML = `<p><strong>No report this time.</strong> You left before saying anything.</p>
        <button type="button" class="btn btn-primary" data-restart-inline>Start again</button>`;
    }
    log.append(done);
    scrollLog();
    mood(said ? 'celebrate' : 'wave');
    if (said) {
      const btn = done.querySelector('[data-report]');
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Writing your report…';
        try {
          const id = await writeReport(s);
          location.hash = `#/report/${id}`;
        } catch (err) {
          console.warn('Report failed:', err);
          btn.disabled = false;
          btn.textContent = 'Try writing the report again';
          done.querySelector('p').innerHTML = `<strong>The report couldn't be written.</strong> ${esc(err?.message || 'Something went wrong.')}`;
        }
      });
    } else {
      done.querySelector('[data-restart-inline]').addEventListener('click', restart);
    }
  }

  // The router re-renders the same route: old listeners are cleaned up, a new session starts.
  function restart() {
    resetSession();
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  /* --- events --- */
  input.addEventListener('input', () => {
    // Typing takes over from the mic; the words heard so far stay in the box.
    if (dictation?.listening) dictation.abort();
    else if (voiceStatus.dataset.tone === 'error') showVoice('');
    syncInput();
    if (!s.pending && !s.ended) mood('listening');
  });
  input.addEventListener('focus', () => { if (!s.pending && !s.ended && s.history.length) mood('listening'); });
  const enterSends = getPrefs().enterToSend;
  input.addEventListener('keydown', (e) => {
    if (!enterSends || e.key !== 'Enter' || e.shiftKey || e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    form.requestSubmit();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    dictation?.abort();
    if (send(s, input.value)) {
      input.value = '';
      syncInput();
    }
  });
  helpBtn.addEventListener('click', () => toggleHelp());
  q('[data-end]').addEventListener('click', () => endEarly(s));
  q('[data-restart]').addEventListener('click', restart);

  const setRail = (open) => {
    stage.toggleAttribute('data-rail-open', open);
    railToggle.setAttribute('aria-expanded', String(open));
    if (open) q('[data-rail-close]').focus();
  };
  railToggle.addEventListener('click', () => setRail(!stage.hasAttribute('data-rail-open')));
  q('[data-rail-close]').addEventListener('click', () => { setRail(false); railToggle.focus(); });
  const onKey = (e) => { if (e.key === 'Escape' && stage.hasAttribute('data-rail-open')) { setRail(false); railToggle.focus(); } };
  document.addEventListener('keydown', onKey);

  /* --- rebuild from the session (resuming) --- */
  s.history.forEach((h) => addMessage(h, false));
  s.notes.forEach((n) => addNote(n, false));
  s.history.filter((h) => h.check).forEach((h) => renderCheck(h, false));
  goals(false);
  suggestions();
  s.view = { addMessage, addNote, renderCheck, goals, mood, typing, suggestions, showError, busy, ready, finish, poke: (g) => baristas.forEach((m) => poke(m, g)) };

  if (s.ended) finish(false);
  else if (s.pending) { busy(); typing(true); mood('chatting'); }
  else if (s.error) showError();
  else if (!s.history.length) runModel(s, 'start');
  else { const last = s.history[s.history.length - 1]; mood(last.who === 'ai' ? (last.mood === 'surprised' ? 'surprised' : 'talking') : 'thinking'); ready(); }

  log.scrollTop = log.scrollHeight;
  if (!s.ended && s.history.length) input.focus({ preventScroll: true });

  return () => {
    dictation?.abort();
    s.view = null;
    unbindLayers();
    document.removeEventListener('keydown', onKey);
    mascots.destroy();
  };
}
