/* App preferences that aren't part of setup: kept apart from store.js (shared with onboarding)
   under their own key. This browser only; every storage call is guarded. */

const KEY = 'convo-app-prefs';

export const PREF_DEFAULTS = {
  name: '',             // what Convo calls you on the dashboard (optional)
  weeklyGoal: 3,        // conversations a week: 1 | 3 | 5 | 7
  zhSize: 'standard',   // standard | large: size of Chinese characters in conversations and reports
  showNotes: true,      // show "Saved for your report" notes during the conversation
  showHelp: true,       // show the "Help me reply" button
  enterToSend: true,    // Enter sends; otherwise Enter adds a line and only the button sends
  calmMascot: false,    // mascot holds one pose per state instead of animating
  scenario: 'cafe',     // the conversation started last: the dashboard offers it first, #/talk opens it
};

let prefs = { ...PREF_DEFAULTS };
try { prefs = { ...prefs, ...(JSON.parse(localStorage.getItem(KEY) || 'null') || {}) }; } catch { /* keep defaults */ }

const listeners = new Set();

export const getPrefs = () => ({ ...prefs });

export function savePrefs(patch) {
  prefs = { ...prefs, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* storage unavailable */ }
  applyPrefs();
  listeners.forEach((fn) => fn(getPrefs()));
}

export function onPrefs(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetPrefs() {
  prefs = { ...PREF_DEFAULTS };
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  applyPrefs();
  listeners.forEach((fn) => fn(getPrefs()));
}

/** Preferences that are pure presentation live on <html> so CSS can follow them. */
export function applyPrefs() {
  const root = document.documentElement;
  root.dataset.zhSize = prefs.zhSize;
  root.toggleAttribute('data-hide-notes', !prefs.showNotes);
  root.toggleAttribute('data-hide-help', !prefs.showHelp);
}
