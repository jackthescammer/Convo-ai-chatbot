/* The app after setup: dashboard, conversation, reports and settings.
   Setup (onboarding) is a separate page, app/index.html, which hands off to this one.

   Routes: #/home  #/talk  #/reports  #/report/:id  #/settings[/section] */

import { applyLayers, poke } from './ui.js';
import { mountMascots, APP_ICONS } from './kit.js';
import { getSettings, onSettings, describeSettings } from './store.js';
import { applyPrefs, onPrefs } from './prefs.js';
import * as dashboard from './dashboard.js';
import * as reportList from './history.js';
import * as talk from './talk.js';
import * as report from './report.js';
import * as settings from './settings.js';

const ROUTES = {
  home: { render: (root) => dashboard.render(root), title: 'Home', nav: 'home' },
  talk: { render: (root) => talk.render(root), title: 'Ordering at a café', nav: 'talk' },
  reports: { render: (root) => reportList.render(root), title: 'Your reports', nav: 'reports' },
  report: { render: (root, arg) => report.render(root, { arg }), title: 'Your report', nav: 'reports' },
  settings: { render: (root, arg) => settings.render(root, { arg }), title: 'Settings', nav: 'settings' },
};

const view = document.getElementById('view');
let cleanup = null;
let first = true;

function route() {
  const [name = '', arg = ''] = location.hash.replace(/^#\/?/, '').split('/');
  const key = ROUTES[name] ? name : 'home';
  if (!ROUTES[name]) window.history.replaceState(null, '', '#/home');
  const r = ROUTES[key];

  cleanup?.();
  cleanup = null;
  view.replaceChildren();
  view.className = `view view-${key}`;
  document.body.dataset.route = key;
  document.title = `${r.title} · Convo`;
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === r.nav) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  syncChrome();

  cleanup = r.render(view, decodeURIComponent(arg)) || null;
  if (!(key === 'settings' && arg)) window.scrollTo(0, 0);
  if (!first && key !== 'talk') view.focus({ preventScroll: true });
  first = false;
}

/* ---------- Chrome: sidebar (desktop), top bar and tab bar (phones) ---------- */
function syncChrome() {
  const resume = talk.hasActiveSession();
  document.querySelectorAll('[data-cta-label]').forEach((n) => { n.textContent = resume ? 'Resume conversation' : 'Start a conversation'; });
  document.querySelectorAll('[data-level-label]').forEach((n) => { n.textContent = describeSettings(getSettings()); });
}

document.querySelectorAll('[data-app-icon]').forEach((n) => { n.innerHTML = APP_ICONS[n.dataset.appIcon] || ''; });
const chromeMascots = mountMascots(document.querySelector('[data-chrome]'));
document.querySelectorAll('.brand').forEach((b) => {
  b.addEventListener('pointerenter', () => poke(chromeMascots.get(`[data-brand="${b.dataset.brandFor}"]`), 'wave'));
});
onSettings(syncChrome);

/* ---------- Start ---------- */
applyPrefs();
applyLayers();
onPrefs(() => applyPrefs());
window.addEventListener('hashchange', route);
route();
