/* The app after setup: dashboard, conversation, reports and settings.
   Setup (onboarding) is a separate page, app/index.html, which hands off to this one.

   Routes: #/home  #/talk[/scenario]  #/voice[/scenario]  #/reports  #/progress  #/report/:id  #/shop  #/settings[/section]
   #/voice is the same conversation by voice messages (voice.js): the same screen, chrome and session. */

import { applyLayers, poke } from './ui.js';
import { mountMascots, APP_ICONS } from './kit.js';
import { getSettings, onSettings, describeSettings } from './store.js';
import { applyPrefs, onPrefs, getPrefs } from './prefs.js';
import { voiceModeSupported } from './voice.js';
import * as dashboard from './dashboard.js';
import * as reportList from './history.js';
import * as progress from './progress.js';
import * as talk from './talk.js';
import * as report from './report.js';
import * as settings from './settings.js';
import * as shop from './shop.js';
import { getWallet, onWallet } from './wallet.js';

const ROUTES = {
  home: { render: (root) => dashboard.render(root), title: 'Home', nav: 'home' },
  talk: { render: (root, arg, opts) => talk.render(root, arg, opts), title: 'Conversation', nav: 'talk' }, // #/talk/<scenario>, #/voice/<scenario>
  reports: { render: (root) => reportList.render(root), title: 'Your reports', nav: 'reports' },
  progress: { render: (root) => progress.render(root), title: 'Your progress', nav: 'progress' },
  report: { render: (root, arg) => report.render(root, { arg }), title: 'Your report', nav: 'reports' },
  shop: { render: (root) => shop.render(root), title: 'Shop', nav: 'shop' },
  settings: { render: (root, arg) => settings.render(root, { arg }), title: 'Settings', nav: 'settings' },
};

const view = document.getElementById('view');
let cleanup = null;
let first = true;

function route() {
  const [path = '', arg = ''] = location.hash.replace(/^#\/?/, '').split('/');
  let name = path;
  let mode = 'text';
  if (name === 'voice') {
    name = 'talk';
    mode = 'voice';
  } else if (name === 'talk' && getPrefs().talkMode === 'voice' && voiceModeSupported) {
    // #/talk opens the way the learner answered last (the Type link switches back first).
    mode = 'voice';
    window.history.replaceState(null, '', `#/voice${arg ? `/${arg}` : ''}`);
  }
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

  cleanup = r.render(view, decodeURIComponent(arg), { mode }) || null;
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

/* Coin balance in the sidebar and top bar. */
const paintCoins = () => document.querySelectorAll('[data-coins]').forEach((n) => { n.textContent = getWallet().coins; });
paintCoins();
onWallet(paintCoins);

/* ---------- Start ---------- */
applyPrefs();
applyLayers();
onPrefs(() => applyPrefs());
window.addEventListener('hashchange', route);
route();
