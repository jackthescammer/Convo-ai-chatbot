import { createConvoMascot } from '../mascot/convo-mascot.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- Mascots (shared engine in /mascot, driven by events only) ---------- */
const mascots = new Map();
document.querySelectorAll('[data-mascot]').forEach((slot) => {
  const label = slot.dataset.label || '';
  if (!label) slot.setAttribute('aria-hidden', 'true');
  const size = slot.dataset.size || '';
  try {
    mascots.set(slot, createConvoMascot(slot, {
      state: slot.dataset.mascot || 'idle',
      size: size.endsWith('%') ? size : Number(size) || 120,
      ariaLabel: label || 'Convo mascot',
    }));
  } catch (err) {
    console.warn('Convo mascot could not render:', err);
  }
});
const mascotFor = (selector) => mascots.get(document.querySelector(selector));
const stageMascot = mascotFor('[data-stage-mascot]');
const setMood = (m, state) => { if (m && m.state !== state) m.setState(state); };
const poke = (m, gesture) => { if (m && !reduceMotion.matches) m.poke(gesture); };

document.querySelectorAll('.brand').forEach((brand) => {
  const m = mascots.get(brand.querySelector('[data-mascot]'));
  brand.addEventListener('pointerenter', () => poke(m, 'wave'));
});

/* ---------- Display layers: 汉字 / Pinyin / English, shared across the page ---------- */
const LAYERS = ['hanzi', 'pinyin', 'english'];
const LAYER_KEY = 'convo-layers';
let layers = { hanzi: true, pinyin: true, english: true };
try {
  const saved = JSON.parse(localStorage.getItem(LAYER_KEY) || 'null');
  if (saved && LAYERS.some((l) => saved[l])) layers = { ...layers, ...saved };
} catch { /* storage unavailable: keep defaults */ }

function applyLayers() {
  LAYERS.forEach((l) => document.documentElement.classList.toggle(`hide-${l}`, !layers[l]));
  document.querySelectorAll('[data-layer-toggle]').forEach((b) => {
    b.setAttribute('aria-pressed', String(Boolean(layers[b.dataset.layerToggle])));
  });
}

let hintTimer;
function showHint(fromEl, text) {
  const hint = fromEl.closest('[data-hint-scope]')?.querySelector('[data-toggle-hint]');
  if (!hint) return;
  hint.textContent = text;
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => { hint.textContent = ''; }, 2600);
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-layer-toggle]');
  if (!btn) return;
  const layer = btn.dataset.layerToggle;
  const next = { ...layers, [layer]: !layers[layer] };
  if (!LAYERS.some((l) => next[l])) {
    showHint(btn, 'Keep at least one of 汉字, Pinyin or English switched on.');
    return;
  }
  layers = next;
  applyLayers();
  try { localStorage.setItem(LAYER_KEY, JSON.stringify(layers)); } catch { /* ignore */ }
});
applyLayers();

/* ---------- Flow ribbon: English goes into Convo, Mandarin comes out ----------
   Each English sentence is paired with its Mandarin. Both lines move at constant
   speeds in a fixed ratio, so a sentence and its Mandarin pass through the pill
   together. Extra space before each Mandarin sentence absorbs the difference in
   length (Chinese is shorter), which keeps the pairs in step for the whole loop. */
const FLOW_LINES = [
  ['Hi! Could I get an iced latte, please?', '你好！我要一杯冰拿铁。'],
  ['Do you have oat milk?', '有燕麦奶吗？'],
  ['Sold out? Regular milk is fine, then.', '卖完了？那牛奶也可以。'],
  ['Less ice, no sugar, please.', '少冰，不要加糖。'],
  ['How much is it?', '多少钱？'],
  ['Can I pay with my phone?', '可以用手机付吗？'],
  ["Yes, it's my first time here.", '对，第一次来。'],
  ["It's really nice here.", '这里很漂亮。'],
  ['Thanks, see you next time!', '谢谢，下次见！'],
];
const FLOW_SPEED = 90;   // English, in viewBox units per second
const FLOW_GAP_EN = 20;  // space before each English sentence
const FLOW_GAP_ZH = 34;  // minimum space before each Mandarin sentence
const FLOW_START = 2;    // first frame: the pill sits just after this sentence
const SVG_NS = 'http://www.w3.org/2000/svg';

function initFlow(root) {
  const svg = root.querySelector('svg');
  const pathIn = svg.querySelector('#flow-in');
  const pathOut = svg.querySelector('#flow-out');
  const textEn = root.querySelector('[data-flow-en]');
  const textZh = root.querySelector('[data-flow-zh]');
  const toggle = root.querySelector('[data-flow-toggle]');
  const mascot = mascotFor('[data-flow-mascot]');
  const still = reduceMotion.matches;

  let L = null;        // measured layout
  let s = 0;           // offset into the English line that sits at the pill
  let current = -1;    // index of the sentence passing through the pill
  let playing = !still;
  let visible = false;
  let speed = 0;       // 0..1, eases towards 1 when playing and 0 when paused
  let raf = 0;
  let last = 0;

  const measure = (cls, str) => {
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('class', cls);
    t.textContent = str;
    svg.append(t);
    const w = t.getComputedTextLength();
    t.remove();
    return w;
  };

  const fill = (text, parts, gaps, copies) => {
    const frag = document.createDocumentFragment();
    for (let c = 0; c < copies; c += 1) {
      parts.forEach((str, i) => {
        const span = document.createElementNS(SVG_NS, 'tspan');
        span.setAttribute('dx', gaps[i].toFixed(2));
        span.textContent = str;
        frag.append(span);
      });
    }
    text.querySelector('textPath').replaceChildren(frag);
  };

  function build() {
    const en = FLOW_LINES.map(([e]) => measure('flow-text flow-en', e));
    const zh = FLOW_LINES.map(([, z]) => measure('flow-text flow-zh', z));
    if (![...en, ...zh].every((w) => w > 0)) return false;

    const spanEn = en.map((w) => w + FLOW_GAP_EN);
    const k = Math.max(...zh.map((w, i) => (w + FLOW_GAP_ZH) / spanEn[i]));
    const gapZh = zh.map((w, i) => k * spanEn[i] - w);
    const E = spanEn.reduce((a, b) => a + b, 0);
    const P = pathIn.getTotalLength();
    const R = pathOut.getTotalLength();
    const ends = [];
    spanEn.reduce((sum, w) => { ends.push(sum + w); return sum + w; }, 0);

    // Keep the position through a rebuild (fonts arriving late); start just after FLOW_START.
    const phase = L ? (s - L.P) / L.E : null;
    L = { E, P, k, ends };
    fill(textEn, FLOW_LINES.map((l) => l[0]), spanEn.map(() => FLOW_GAP_EN), Math.ceil(P / E) + 1);
    fill(textZh, FLOW_LINES.map((l) => l[1]), gapZh, Math.ceil((P + E) / E + R / (k * E)) + 1);
    s = phase == null ? P + ((((ends[FLOW_START] - P) % E) + E) % E) : P + phase * E;
    draw();
    return true;
  }

  function draw() {
    // The character at offset s sits at the pill: the end of the in-path, the start of the ribbon.
    textEn.setAttribute('x', (L.P - s).toFixed(2));
    textZh.setAttribute('x', (-L.k * s).toFixed(2));
    const at = L.ends.findIndex((end) => s % L.E < end);
    if (at !== current) {
      if (current !== -1 && speed > 0.5) poke(mascot, 'nod'); // a sentence has gone through
      current = at;
    }
  }

  function tick(now) {
    // The first frame's timestamp can predate `last`, so clamp dt at 0.
    const dt = Math.min(0.064, Math.max(0, (now - last) / 1000));
    last = now;
    speed += ((playing ? 1 : 0) - speed) * (1 - Math.exp(-dt / 0.28));
    if (!playing && speed < 0.004) speed = 0;
    s -= FLOW_SPEED * speed * dt;
    if (s < L.P) s += L.E;
    draw();
    raf = playing || speed > 0 ? requestAnimationFrame(tick) : 0;
  }
  function run() {
    if (raf || !L || !visible || document.hidden || (!playing && speed === 0)) return;
    if (playing) setMood(mascot, 'talking');
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
  function halt() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  function setToggle() {
    toggle.dataset.state = playing ? 'playing' : 'paused';
    toggle.setAttribute('aria-label', playing ? 'Pause the animation' : 'Play the animation');
  }

  if (still) {
    root.dataset.static = '';
    toggle.tabIndex = -1;
    toggle.setAttribute('aria-hidden', 'true');
    setMood(mascot, 'happy');
  } else {
    toggle.addEventListener('click', () => {
      playing = !playing;
      setToggle();
      if (playing) run();
      else setMood(mascot, 'idle');
    });
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) run(); else halt();
    }).observe(root);
    document.addEventListener('visibilitychange', () => { if (document.hidden) halt(); else run(); });
  }

  // Measure once the fonts are in, or after 3 s whatever happens; re-measure if a font lands later.
  const ready = Promise.all([
    document.fonts.load('600 26px Figtree'),
    document.fonts.load('500 28px "Noto Sans SC"', FLOW_LINES.map((l) => l[1]).join('')),
  ]);
  Promise.race([ready, new Promise((r) => { setTimeout(r, 3000); })])
    .catch(() => {})
    .then(() => { if (build()) run(); });
  document.fonts.addEventListener('loadingdone', () => { if (L) build(); });
}

const flowRoot = document.querySelector('[data-flow]');
if (flowRoot) initFlow(flowRoot);

/* ---------- Sample conversation ---------- */
const SCRIPT = [
  { who: 'ai', zh: '你好！你想喝什么？', py: 'Nǐ hǎo! Nǐ xiǎng hē shénme?', en: 'Hi! What would you like to drink?' },
  { who: 'you', zh: '我要一个拿铁。', py: 'Wǒ yào yí ge nátiě.', en: "I'd like a latte.",
    notes: [{ tag: 'natural', label: 'More natural', from: '一个拿铁', to: '一杯拿铁' }] },
  { who: 'ai', zh: '好的，一杯拿铁。热的还是冰的？', py: 'Hǎo de, yì bēi nátiě. Rè de háishi bīng de?', en: 'Sure, one latte. Hot or iced?' },
  { who: 'you', zh: '冰的，要燕麦奶。', py: 'Bīng de, yào yànmài nǎi.', en: 'Iced, with oat milk.',
    notes: [{ tag: 'ok', label: 'Left alone', zh: '冰的，要燕麦奶。', text: 'Correct as it is.' }] },
  { who: 'ai', zh: '不好意思，燕麦奶卖完了。牛奶可以吗？', py: 'Bù hǎoyìsi, yànmài nǎi mài wán le. Niúnǎi kěyǐ ma?', en: "Sorry, we're out of oat milk. Is regular milk OK?", mood: 'surprised' },
  { who: 'you', zh: '可以。多少钱吗？', py: 'Kěyǐ. Duōshao qián ma?', en: 'Sure. How much is it?',
    notes: [
      { tag: 'surprise', label: 'Handled a surprise', text: 'Oat milk was sold out. You kept going in Mandarin.' },
      { tag: 'grammar', label: 'Grammar', from: '多少钱吗', to: '多少钱' },
    ] },
  { who: 'ai', zh: '二十八块。你是第一次来吗？', py: 'Èrshíbā kuài. Nǐ shì dì-yī cì lái ma?', en: '28 kuai. Is this your first time here?' },
  { who: 'you', zh: '是的！这里是很漂亮。', py: 'Shì de! Zhèlǐ shì hěn piàoliang.', en: "Yes! It's really nice here.",
    notes: [{ tag: 'grammar', label: 'Grammar', from: '这里是很漂亮', to: '这里很漂亮' }] },
  { who: 'ai', zh: '谢谢！你的拿铁马上好。', py: 'Xièxie! Nǐ de nátiě mǎshàng hǎo.', en: 'Thank you! Your latte will be ready in a moment.' },
];

const stage = document.querySelector('[data-stage]');
const chat = document.querySelector('[data-chat]');
const notesEl = document.querySelector('[data-notes]');
const doneEl = document.querySelector('[data-done]');
const playBtn = document.querySelector('[data-play]');

const el = (tag, cls, html) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html != null) node.innerHTML = html;
  return node;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const layered = (line) => `<p class="layered"><span class="py">${esc(line.py)}</span><span class="zh" lang="zh-Hans">${esc(line.zh)}</span><span class="en">${esc(line.en)}</span></p>`;
const ARROW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function scrollChat() {
  chat.scrollTo({ top: chat.scrollHeight, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
}

function addMessage(line, animate) {
  const msg = el('div', `msg msg-${line.who}${animate ? ' is-new' : ''}`);
  msg.append(el('p', 'msg-who', line.who === 'ai' ? 'Convo <span class="msg-role">as the barista</span>' : 'You'));
  msg.append(el('div', 'bubble', layered(line)));
  chat.append(msg);
  scrollChat();
}

function addTyping(who) {
  const msg = el('div', `msg msg-${who} is-new`);
  msg.dataset.typing = '';
  msg.append(el('div', 'bubble typing', '<span></span><span></span><span></span>'));
  msg.setAttribute('aria-hidden', 'true');
  chat.append(msg);
  scrollChat();
}
const removeTyping = () => chat.querySelectorAll('[data-typing]').forEach((n) => n.remove());

function addNote(note, animate) {
  const li = el('li', `note${animate ? ' is-new' : ''}`);
  li.append(el('span', `tag tag-${note.tag}`, esc(note.label)));
  if (note.from) {
    li.append(el('p', 'note-change',
      `<span class="from" lang="zh-Hans">${esc(note.from)}</span>${ARROW}<span class="to" lang="zh-Hans">${esc(note.to)}</span>`));
  } else {
    li.append(el('p', 'note-text', `${note.zh ? `<span lang="zh-Hans">${esc(note.zh)}</span> ` : ''}${esc(note.text)}`));
  }
  notesEl.append(li);
}

/* A pausable timeline: one pending step at a time. */
let pending = null;
let timer = null;
let remaining = 0;
let startedAt = 0;
let cursor = 0;
let status = 'ready'; // ready | playing | paused | ended
let autoPaused = false;

function after(ms, fn) {
  pending = fn;
  remaining = ms;
  if (status === 'playing') arm();
}
function arm() {
  startedAt = performance.now();
  timer = setTimeout(() => { timer = null; const fn = pending; pending = null; fn && fn(); }, remaining);
}
function disarm() {
  if (!timer) return;
  clearTimeout(timer);
  timer = null;
  remaining = Math.max(0, remaining - (performance.now() - startedAt));
}

function setStatus(next) {
  status = next;
  if (!playBtn) return;
  const label = { ready: 'Play conversation', playing: 'Pause conversation', paused: 'Resume conversation', ended: 'Replay conversation' }[next];
  playBtn.dataset.state = next === 'ready' ? 'paused' : next;
  playBtn.setAttribute('aria-label', label);
}

function playLine() {
  if (cursor >= SCRIPT.length) return finish(true);
  const line = SCRIPT[cursor];
  if (line.who === 'ai') {
    setMood(stageMascot, 'chatting');
    addTyping('ai');
    after(950, () => {
      removeTyping();
      addMessage(line, true);
      setMood(stageMascot, line.mood || 'talking');
      if (line.mood === 'surprised') poke(stageMascot, 'shake');
      cursor += 1;
      after(line.mood ? 2300 : 1700, playLine);
    });
  } else {
    setMood(stageMascot, 'listening');
    addTyping('you');
    after(1100, () => {
      removeTyping();
      addMessage(line, true);
      setMood(stageMascot, 'thinking');
      const notes = line.notes || [];
      let i = 0;
      const nextNote = () => {
        if (i < notes.length) {
          addNote(notes[i], true);
          if (notes[i].tag === 'ok') poke(stageMascot, 'nod');
          i += 1;
          after(520, nextNote);
        } else {
          cursor += 1;
          after(600, playLine);
        }
      };
      after(650, nextNote);
    });
  }
}

function finish(animate) {
  const end = el('p', `chat-end${animate ? ' msg is-new' : ''}`, 'Conversation finished');
  chat.append(end);
  scrollChat();
  doneEl.hidden = false;
  setMood(stageMascot, 'celebrate');
  setStatus('ended');
}

function reset() {
  disarm();
  pending = null;
  cursor = 0;
  chat.replaceChildren();
  notesEl.replaceChildren();
  doneEl.hidden = true;
  setMood(stageMascot, 'idle');
}

function renderAll() {
  reset();
  SCRIPT.forEach((line) => {
    addMessage(line, false);
    (line.notes || []).forEach((n) => addNote(n, false));
  });
  cursor = SCRIPT.length;
  finish(false);
  chat.scrollTop = chat.scrollHeight;
}

function start() {
  reset();
  setStatus('playing');
  after(500, playLine);
}

function pause() {
  if (status !== 'playing') return;
  disarm();
  setStatus('paused');
}
function resume() {
  if (status !== 'paused' && status !== 'ready') return;
  setStatus('playing');
  if (pending) arm(); else if (cursor === 0) after(300, playLine);
}

if (stage && chat) {
  playBtn?.addEventListener('click', () => {
    autoPaused = false;
    if (status === 'playing') pause();
    else if (status === 'ended') start();
    else if (status === 'ready' && cursor === 0) start();
    else resume();
  });

  if (reduceMotion.matches) {
    renderAll();
  } else {
    setStatus('ready');
    let started = false;
    const io = new IntersectionObserver((entries) => {
      const visible = entries[0].isIntersecting;
      if (visible && !started) { started = true; start(); return; }
      if (!visible && status === 'playing') { pause(); autoPaused = true; }
      else if (visible && autoPaused && status === 'paused') { autoPaused = false; resume(); }
    }, { threshold: 0.15 });
    io.observe(stage);
    const r = stage.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.85 && r.bottom > 0) { started = true; start(); }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && status === 'playing') { pause(); autoPaused = true; }
      else if (!document.hidden && autoPaused && status === 'paused') { autoPaused = false; resume(); }
    });
  }
}

/* ---------- Levels tabs ---------- */
const LEVELS = {
  easy: {
    zh: '你想喝什么？', py: 'Nǐ xiǎng hē shénme?', en: 'What would you like to drink?',
    note: 'Short questions, one thing at a time, everyday words.',
  },
  standard: {
    zh: '你好，想喝点什么？要热的还是冰的？', py: 'Nǐ hǎo, xiǎng hē diǎn shénme? Yào rè de háishi bīng de?', en: 'Hi, what can I get you? Hot or iced?',
    note: 'Natural pace, with follow-up questions you have to answer.',
  },
  challenging: {
    zh: '欢迎光临！今天想喝点什么？我们新出了桂花拿铁，要不要试试？',
    py: 'Huānyíng guānglín! Jīntiān xiǎng hē diǎn shénme? Wǒmen xīn chū le guìhuā nátiě, yào bu yào shìshi?',
    en: "Welcome! What would you like today? We've just brought out an osmanthus latte. Want to try it?",
    note: "Longer sentences, new words, and suggestions you didn't ask for.",
  },
};
const tabs = [...document.querySelectorAll('[role="tab"][data-level]')];
const panel = document.getElementById('panel-level');
const levelLine = document.querySelector('[data-level-line]');
const levelNote = document.querySelector('[data-level-note]');
const levelMascot = mascotFor('.level-speaker [data-mascot]');

function selectTab(tab, focus) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  });
  const data = LEVELS[tab.dataset.level];
  levelLine.innerHTML = `<span class="py">${esc(data.py)}</span><span class="zh" lang="zh-Hans">${esc(data.zh)}</span><span class="en">${esc(data.en)}</span>`;
  levelNote.textContent = data.note;
  panel.setAttribute('aria-labelledby', tab.id);
  panel.classList.remove('is-swapping');
  void panel.offsetWidth;
  panel.classList.add('is-swapping');
  poke(levelMascot, 'nod');
  if (focus) tab.focus();
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectTab(tab, false));
  tab.addEventListener('keydown', (e) => {
    let j = null;
    if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
    if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') j = 0;
    if (e.key === 'End') j = tabs.length - 1;
    if (j !== null) { e.preventDefault(); selectTab(tabs[j], true); }
  });
});

/* ---------- Closing mascot waves when you arrive ---------- */
const closeSection = document.querySelector('.close');
const closeMascot = mascotFor('.close [data-mascot]');
if (closeSection && closeMascot) {
  let waved = false;
  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !waved) {
      waved = true;
      setMood(closeMascot, 'wave');
      setTimeout(() => setMood(closeMascot, 'happy'), 2200);
    }
  }, { threshold: 0.5 }).observe(closeSection);
}

/* ---------- Nav border on scroll ---------- */
const nav = document.querySelector('[data-nav]');
const onScroll = () => nav?.classList.toggle('is-scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();
