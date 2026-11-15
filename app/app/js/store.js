/* Settings and reports for this browser only. No accounts: nothing leaves the device.
   Every storage call is guarded, so a private window or blocked storage still works for the session. */

const SETTINGS_KEY = 'convo-app-settings';
const REPORTS_KEY = 'convo-app-reports';
const MAX_REPORTS = 12;

const DEFAULTS = {
  onboarded: false,
  reasons: [],       // why they're learning, any number of REASONS ids (onboarding question 1)
  knows: null,       // which proficiency option they picked
  level: 'A2',       // A1 | A2
  difficulty: 'standard', // easy | standard | challenging
  difficultyPicked: false, // false until the learner chooses; until then setup suggests one from their level
};

const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
};

let settings = { ...DEFAULTS, ...read(SETTINGS_KEY, {}) };
/* Older setups saved one `reason`; it's now a list. */
if (!Array.isArray(settings.reasons)) settings.reasons = [];
if ('reason' in settings) {
  if (settings.reason && !settings.reasons.length) settings.reasons = [settings.reason];
  delete settings.reason;
}
let reports = read(REPORTS_KEY, []);
if (!Array.isArray(reports)) reports = [];

const listeners = new Set();

export const getSettings = () => ({ ...settings });

export function saveSettings(patch) {
  settings = { ...settings, ...patch };
  write(SETTINGS_KEY, settings);
  listeners.forEach((fn) => fn(getSettings()));
}

export function onSettings(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const listReports = () => reports.slice();
export const getReport = (id) => reports.find((r) => r.id === id) || null;

export function addReport(report) {
  reports = [report, ...reports.filter((r) => r.id !== report.id)].slice(0, MAX_REPORTS);
  write(REPORTS_KEY, reports);
}

export function clearAll() {
  settings = { ...DEFAULTS };
  reports = [];
  try {
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(REPORTS_KEY);
    localStorage.removeItem('convo-app-wallet'); // coins and wardrobe (wallet.js)
  } catch { /* ignore */ }
  listeners.forEach((fn) => fn(getSettings()));
}

/* Labels shared by every screen. */
export const LEVEL_LABEL = { A1: 'A1', A2: 'A2' };
export const DIFFICULTY_LABEL = { easy: 'Easy', standard: 'Standard', challenging: 'Challenging' };
export const describeSettings = (s) => `${LEVEL_LABEL[s.level]} · ${DIFFICULTY_LABEL[s.difficulty]}`;
