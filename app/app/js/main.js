/* Convo setup (onboarding) shell: routing, the two screen shells, the guide mascot and the
   keyboard. Screens and their content live in onboarding.js. The app people use after setup
   is /app/home.html; someone already set up who opens /app/ with no step in the URL goes there.

   Web behaviour:
   - Every screen has its own URL (#/why, #/level …). Browser Back and Forward walk the steps,
     a refresh keeps your place, and answers are already saved when you leave a screen.
   - Number keys pick the matching option, Enter continues, and focus moves to each new
     question so screen readers announce it.
   - One mascot stays on screen through the questions and changes state when something
     happens (you arrive, you pick, you finish). It travels between the centred and the
     side layout instead of being redrawn. */

import { createConvoMascot } from '../../mascot/convo-mascot.js';
import { getSettings } from './store.js';
import { SCREENS, ORDER, QUESTION_COUNT, APP_HOME, RETURNS } from './onboarding.js';
import { el, esc, ICONS, applyLayers, reduceMotion, setMood, poke } from './ui.js';

const app = document.getElementById('app');
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

let current = null;   // { name, from }
let shell = null;     // the mounted shell
let timers = [];      // per-screen timers, cleared on every render
let noteTimer = 0;

/* ---------- Routes ---------- */
function parse(hash) {
  const m = /^#\/([a-z]+)(?:\?(.*))?$/.exec(hash || '');
  if (!m || !SCREENS[m[1]]) return null;
  const from = new URLSearchParams(m[2] || '').get('from');
  return { name: m[1], from: from && (SCREENS[from] || RETURNS[from]) ? from : null };
}
const hashFor = (r) => `#/${r.name}${r.from ? `?from=${r.from}` : ''}`;
const defaultRoute = () => ({ name: 'welcome', from: null });
const depth = () => history.state?.depth || 0;

/* `edit` counts the screens opened from a summary's Change link (level, then check, say),
   so Save can step straight back to that summary instead of stacking another copy of it. */
function go(name, { from = null, replace = false } = {}) {
  const route = { name, from };
  const prev = history.state || {};
  const edit = from ? (prev.from === from ? (prev.edit || 0) : 0) + (replace ? 0 : 1) : 0;
  history[replace ? 'replaceState' : 'pushState']({ depth: replace ? depth() : depth() + 1, from, edit }, '', hashFor(route));
  render(route);
}

function finishEdit() {
  const outside = RETURNS[current.from];
  if (outside) { location.assign(outside); return; } // a fresh load, so the page shows the new answer
  const steps = history.state?.edit || 0;
  if (steps > 0 && depth() >= steps) history.go(-steps);
  else go(current.from, { replace: true });
}

function goBack() {
  if (depth() > 0) { history.back(); return; }
  const outside = RETURNS[current.from];
  if (outside) {
    // Opened from that page: step back to it if it's the previous entry, otherwise open it.
    if (document.referrer && document.referrer.startsWith(location.origin + outside.split('#')[0])) history.back();
    else location.assign(outside);
    return;
  }
  go(current.from || SCREENS[current.name].back || 'welcome', { replace: true });
}

window.addEventListener('popstate', () => render(parse(location.hash) || defaultRoute()));
window.addEventListener('hashchange', () => {
  const route = parse(location.hash) || defaultRoute();
  if (!current || hashFor(route) !== hashFor(current)) render(route);
});

/* In-app links go through the router so Back keeps working. */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#/"]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const route = parse(a.getAttribute('href'));
  if (!route) return;
  e.preventDefault();
  go(route.name, { from: route.from });
});

/* ---------- Helpers ---------- */
const later = (ms, fn) => { timers.push(setTimeout(fn, reduceMotion.matches ? 0 : ms)); };
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

function mascot(slot, state) {
  slot.setAttribute('aria-hidden', 'true');
  try {
    return createConvoMascot(slot, { state, size: '100%' });
  } catch (err) {
    console.warn('Convo mascot could not render:', err);
    return null;
  }
}

/** Arrival mood, then an optional settle state once the gesture has played (a wave, say). */
function arrive(m, screen, s, ctx) {
  const mood = typeof screen.mood === 'function' ? screen.mood(s, ctx) : screen.mood;
  if (!m || !mood) return;
  setMood(m, mood);
  if (screen.settle) later(2400, () => setMood(m, screen.settle));
}

/** Slides new content in from the direction of travel. Content is visible without it. */
function enter(nodes, dir = 1) {
  if (reduceMotion.matches) return;
  [nodes].flat().filter(Boolean).forEach((node, i) => {
    node.animate(
      [{ opacity: 0, transform: `translateX(${dir * 18}px)` }, { opacity: 1, transform: 'none' }],
      { duration: 380, delay: i * 60, easing: EASE, fill: 'backwards' },
    );
  });
}

/** Moves a node from where it was (`before`) to where it is now. */
function flip(node, before) {
  if (reduceMotion.matches || !before) return;
  const after = node.getBoundingClientRect();
  if (!after.width) return;
  const dx = before.left - after.left;
  const dy = before.top - after.top;
  const s = before.width / after.width;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(s - 1) < 0.01) return;
  node.animate(
    [{ transform: `translate(${dx}px, ${dy}px) scale(${s})` }, { transform: 'none' }],
    { duration: 620, easing: EASE },
  );
}

function makeCtx(route) {
  return {
    from: route.from,
    react: (gesture) => poke(shell?.guide, gesture),
    refresh: () => shell?.refresh?.(),
    enter: (node) => enter(node, 1),
    note: (text, tone = '') => {
      if (!shell?.note) return;
      clearTimeout(noteTimer);
      shell.note.textContent = text;
      shell.note.dataset.tone = tone;
      if (text) noteTimer = setTimeout(() => { shell.note.textContent = ''; }, 3200);
    },
  };
}

function teardown() {
  clearTimers();
  shell?.mascots?.forEach((m) => m?.destroy());
  shell = null;
}

/* ---------- Page shell: welcome and the conversation holding screen ---------- */
function renderPage(route, screen, s, ctx, isFirst) {
  teardown();
  const root = el('div', 'pg');
  root.innerHTML = `
    <header class="pg-top">
      <a class="brand" href="/landing/index.html" aria-label="Convo home page">
        <span class="brand-mark" data-brand></span>
        <span class="brand-word">Convo</span>
      </a>
    </header>
    <main class="pg-main" id="main">${screen.page(s, ctx)}</main>`;
  app.replaceChildren(root);

  const brand = mascot(root.querySelector('[data-brand]'), 'idle');
  root.querySelector('.brand').addEventListener('pointerenter', () => poke(brand, 'wave'));
  const slot = root.querySelector('[data-mascot]');
  const hero = slot ? mascot(slot, 'idle') : null;
  shell = { kind: 'page', root, guide: hero, mascots: [brand, hero] };

  arrive(hero, screen, s, ctx);
  if (!isFirst) {
    enter(root.querySelector('.pg-center'), 1);
    root.querySelector('h1')?.focus({ preventScroll: true });
  }
}

/* ---------- Flow shell: back, progress, the guide's bubble, the Continue bar ---------- */
function buildFlow() {
  teardown();
  const root = el('div', 'ob');
  root.innerHTML = `
    <header class="ob-top">
      <div class="ob-top-inner">
        <button type="button" class="ob-back" data-back aria-label="Back">${ICONS.back}</button>
        <div class="ob-progress" data-progress role="progressbar" aria-label="Setup progress" aria-valuemin="0" aria-valuemax="${QUESTION_COUNT}">
          <span class="ob-progress-fill"></span>
        </div>
        <p class="ob-count" data-count aria-hidden="true"></p>
      </div>
    </header>
    <main class="ob-main" id="main">
      <div class="ob-col">
        <div class="ob-ask">
          <span class="ob-guide" data-guide></span>
          <div class="ob-bubble" data-bubble></div>
        </div>
        <form class="ob-body" id="ob-form" data-form novalidate></form>
      </div>
    </main>
    <footer class="ob-foot">
      <div class="ob-foot-inner">
        <p class="ob-note" data-note aria-live="polite"></p>
        <button type="submit" form="ob-form" class="btn btn-primary ob-cta" data-cta>Continue</button>
      </div>
    </footer>`;
  app.replaceChildren(root);

  const q = (sel) => root.querySelector(sel);
  const guideSlot = q('[data-guide]');
  const guide = mascot(guideSlot, 'idle');
  shell = {
    kind: 'flow', root, guide, guideSlot, mascots: [guide],
    bubble: q('[data-bubble]'), form: q('[data-form]'), cta: q('[data-cta]'), note: q('[data-note]'),
    progress: q('[data-progress]'), count: q('[data-count]'),
    screen: null, refresh: null,
  };

  q('[data-back]').addEventListener('click', goBack);
  shell.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const { screen } = shell;
    if (!screen || shell.cta.disabled) return;
    const next = screen.next ? screen.next() : null;
    if (!next) return;
    if (typeof next === 'object') location.assign(next.href); // setup is done: on to the app
    else if (current.from) finishEdit();
    else go(next);
  });
  return shell;
}

function renderFlow(route, screen, s, ctx, dir, isFirst) {
  const fresh = !shell || shell.kind !== 'flow';
  if (fresh) buildFlow();
  clearTimers();
  const { root, bubble, form, cta, guideSlot } = shell;
  shell.screen = screen;

  // Layout. The guide mascot moves rather than being redrawn.
  const before = !fresh && root.dataset.layout !== screen.layout ? guideSlot.getBoundingClientRect() : null;
  root.dataset.layout = screen.layout;
  root.dataset.width = screen.width;
  root.toggleAttribute('data-edit', Boolean(route.from));
  window.scrollTo(0, 0);

  // Progress
  const step = screen.step === 'done' ? QUESTION_COUNT : screen.step || 0;
  const p = step / QUESTION_COUNT;
  root.style.setProperty('--p', p.toFixed(3));
  root.dataset.started = String(p > 0);
  root.dataset.step = String(screen.step);
  shell.progress.setAttribute('aria-valuenow', String(step));
  shell.progress.setAttribute('aria-valuetext', screen.step === 'done' ? 'Setup complete' : step ? `Step ${step} of ${QUESTION_COUNT}` : 'Not started');
  shell.count.textContent = screen.step === 'done' ? 'Done' : screen.step > 0 ? `${screen.step} of ${QUESTION_COUNT}` : '';

  // Bubble: the reaction to your last choice, then the question
  const b = screen.bubble(s, ctx);
  const react = route.from ? '' : b.react;
  bubble.innerHTML = `${react ? `<p class="ob-react">${esc(react)}</p>` : ''}<h1 class="ob-q" id="ob-q" tabindex="-1">${esc(b.question)}</h1>`;

  // Body: a fresh node each time, so listeners never pile up on the form
  const body = el('div', 'ob-body-inner', screen.body ? screen.body(s, ctx) : '');
  form.replaceChildren(body);
  form.setAttribute('aria-labelledby', 'ob-q');
  applyLayers();
  screen.bind?.(body, ctx);

  // Continue
  cta.textContent = route.from ? 'Save' : screen.cta || 'Continue';
  shell.refresh = () => { cta.disabled = screen.ready ? !screen.ready(getSettings()) : false; };
  shell.refresh();
  ctx.note('');

  // Motion: mascot travels, bubble pops from the speaker's side, content slides in
  flip(guideSlot, before);
  if (!isFirst && !reduceMotion.matches) {
    bubble.animate(
      [{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }],
      { duration: 320, easing: EASE },
    );
    enter(body, dir || 1);
  }
  arrive(shell.guide, screen, s, ctx);
  if (!isFirst) bubble.querySelector('h1').focus({ preventScroll: true });
}

/* ---------- Render ---------- */
function render(route) {
  const screen = SCREENS[route.name];
  const prev = current;
  current = route;
  screen.enter?.(getSettings());
  const s = getSettings();
  const ctx = makeCtx(route);
  const dir = prev ? Math.sign(ORDER.indexOf(route.name) - ORDER.indexOf(prev.name)) || 1 : 1;
  const isFirst = !prev;
  document.title = `${screen.title} · Convo`;
  if (screen.shell === 'page') renderPage(route, screen, s, ctx, isFirst);
  else renderFlow(route, screen, s, ctx, dir, isFirst);
}

/* ---------- Keyboard: 1–9 pick an option, Enter continues ---------- */
document.addEventListener('keydown', (e) => {
  if (!shell || shell.kind !== 'flow' || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  const t = e.target;
  if (t.closest?.('textarea, select, [contenteditable], input[type="text"]')) return;
  if (/^[1-9]$/.test(e.key)) {
    const input = shell.form.querySelectorAll('input[data-option]')[Number(e.key) - 1];
    if (!input) return;
    e.preventDefault();
    input.focus();
    if (input.type === 'checkbox' || !input.checked) input.click();
    return;
  }
  // Browsers don't reliably submit on Enter from a radio or checkbox, so options continue too.
  if (e.key === 'Enter' && (t.matches?.('input[data-option]') || !t.closest?.('button, a, input, summary'))) {
    e.preventDefault();
    shell.form.requestSubmit();
  }
});

/* ---------- Start ---------- */
const requested = parse(location.hash);
if (!requested && getSettings().onboarded) {
  location.replace(APP_HOME);
} else {
  applyLayers();
  const initial = requested || defaultRoute();
  history.replaceState({ ...history.state, depth: depth() }, '', hashFor(initial));
  render(initial);
}
