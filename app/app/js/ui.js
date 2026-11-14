import { createConvoMascot } from '../../mascot/convo-mascot.js';

export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- DOM ---------- */
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function el(tag, cls, html) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html != null) node.innerHTML = html;
  return node;
}

/** A layered line: pinyin, 汉字, English (any layer may be missing). `mark` wraps one substring of the 汉字. */
export function layered(line, { cls = 'layered', mark = null } = {}) {
  let zh = esc(line.zh);
  if (mark && line.zh?.includes(mark)) zh = zh.replace(esc(mark), `<mark>${esc(mark)}</mark>`);
  return `<p class="${cls}">${line.py ? `<span class="py">${esc(line.py)}</span>` : ''}<span class="zh" lang="zh-Hans">${zh}</span>${line.en ? `<span class="en">${esc(line.en)}</span>` : ''}</p>`;
}

export const wait = (ms) => new Promise((r) => { setTimeout(r, reduceMotion.matches ? Math.min(ms, 120) : ms); });

/* ---------- Mascots (shared engine in /mascot; state changes follow events) ---------- */
export function mountMascots(root) {
  const made = new Map();
  root.querySelectorAll('[data-mascot]').forEach((slot) => {
    if (slot.dataset.mounted) return;
    slot.dataset.mounted = '';
    slot.setAttribute('aria-hidden', 'true');
    const size = slot.dataset.size || '';
    try {
      made.set(slot, createConvoMascot(slot, {
        state: slot.dataset.mascot || 'idle',
        size: size.endsWith('%') ? size : Number(size) || 120,
      }));
    } catch (err) {
      console.warn('Convo mascot could not render:', err);
    }
  });
  return {
    get: (selector) => made.get(root.querySelector(selector)),
    destroy: () => made.forEach((m) => m.destroy()),
  };
}
export const setMood = (m, state) => { if (m && m.state !== state) m.setState(state); };
export const poke = (m, gesture) => { if (m && !reduceMotion.matches) m.poke(gesture); };

/* ---------- Display layers: 汉字 / Pinyin / English (same storage key as the landing page) ---------- */
export const LAYERS = ['hanzi', 'pinyin', 'english'];
const LAYER_KEY = 'convo-layers';
let layers = { hanzi: true, pinyin: true, english: true };
try {
  const saved = JSON.parse(localStorage.getItem(LAYER_KEY) || 'null');
  if (saved && LAYERS.some((l) => saved[l])) layers = { ...layers, ...saved };
} catch { /* storage unavailable: keep defaults */ }

export const getLayers = () => ({ ...layers });

export function applyLayers() {
  LAYERS.forEach((l) => document.documentElement.classList.toggle(`hide-${l}`, !layers[l]));
  document.querySelectorAll('[data-layer-toggle]').forEach((b) => {
    const on = Boolean(layers[b.dataset.layerToggle]);
    if (b.type === 'checkbox') b.checked = on;
    else b.setAttribute('aria-pressed', String(on));
  });
}

/** Turns one layer on or off. Returns false (and changes nothing) if it would switch every layer off. */
export function setLayer(layer, on) {
  const next = { ...layers, [layer]: on };
  if (!LAYERS.some((l) => next[l])) return false;
  layers = next;
  try { localStorage.setItem(LAYER_KEY, JSON.stringify(layers)); } catch { /* ignore */ }
  applyLayers();
  return true;
}

export const LAST_LAYER_HINT = 'Keep at least one of 汉字, Pinyin or English switched on.';

/** Wires every [data-layer-toggle] button inside `root`. Hints go to the nearest [data-toggle-hint]. */
export function bindLayerToggles(root) {
  let timer;
  const onClick = (e) => {
    const btn = e.target.closest('button[data-layer-toggle]');
    if (!btn || !root.contains(btn)) return;
    const layer = btn.dataset.layerToggle;
    if (!setLayer(layer, !layers[layer])) {
      const hint = btn.closest('[data-hint-scope]')?.querySelector('[data-toggle-hint]');
      if (!hint) return;
      hint.textContent = LAST_LAYER_HINT;
      clearTimeout(timer);
      timer = setTimeout(() => { hint.textContent = ''; }, 2600);
    }
  };
  root.addEventListener('click', onClick);
  applyLayers();
  return () => { root.removeEventListener('click', onClick); clearTimeout(timer); };
}

export const layerChips = (label = 'Show') => `
  <div class="layer-toggle" role="group" aria-label="${esc(label)}">
    <button type="button" class="chip" data-layer-toggle="hanzi" aria-pressed="true"><span lang="zh-Hans">汉字</span></button>
    <button type="button" class="chip" data-layer-toggle="pinyin" aria-pressed="true">Pinyin</button>
    <button type="button" class="chip" data-layer-toggle="english" aria-pressed="true">English</button>
  </div>`;

/* ---------- Icons: one stroke family, 24px grid, round caps ---------- */
const svg = (body, extra = '') => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${extra}>${body}</svg>`;

export const ICONS = {
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  send: svg('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', ' stroke-width="2.6"'),
  settings: svg('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>'),
  help: svg('<path d="M12 3.5l1.7 4.3 4.3 1.7-4.3 1.7L12 15.5l-1.7-4.3L6 9.5l4.3-1.7z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'),
  notes: svg('<path d="M7 4h10a1 1 0 0 1 1 1v15l-3-2-3 2-3-2-3 2V5a1 1 0 0 1 1-1z"/><path d="M9.5 9h5M9.5 12.5h5"/>'),
  flag: svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
  plane: svg('<path d="M10.5 13.5L4 11l1.5-1.5 7 1 4-4c1-1 2.5-1.3 3-.8s.2 2-.8 3l-4 4 1 7L14 21.2l-2.5-6.5-3 3V20l-1.5 1-1-3.5L3 16.5l1-1.5h2.3z"/>', ' stroke-width="1.8"'),
  book: svg('<path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5v13c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z"/><path d="M12 6v13"/>'),
  home: svg('<path d="M4 10.5L12 4l8 6.5"/><path d="M6 9v10h12V9"/><path d="M10 19v-5h4v5"/>'),
  people: svg('<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M16 14.2c2.3-.3 4 1.3 4.5 4.3"/>'),
  sparkle: svg('<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/><path d="M18.5 16v4M16.5 18h4"/>'),
  chat: svg('<path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M8.5 10.5h7"/>'),
  question: svg('<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.3 2.4c-.6.3-.9.8-.9 1.4v.6"/><path d="M12 17h.01"/>'),
  bolt: svg('<path d="M13 3L5.5 13.5H12L11 21l7.5-10.5H12z"/>'),
  briefcase: svg('<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5v2"/><path d="M3.5 12.5h17"/>'),
};

/** Signal bars for proficiency options (1 to 4 filled). */
export const bars = (n) => `<svg class="icon bars" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${[0, 1, 2, 3].map((i) => {
  const h = 5 + i * 4.5;
  return `<rect x="${3 + i * 5}" y="${21 - h}" width="3.4" height="${h}" rx="1.2" class="${i < n ? 'on' : 'off'}"/>`;
}).join('')}</svg>`;
