/* Helpers for the app screens (dashboard, conversation, reports, settings), on top of the
   shared ui.js. Kept separate so onboarding and the app can change independently. */

import { createConvoMascot } from '../../mascot/convo-mascot.js';
import { esc } from './ui.js';
import { getPrefs } from './prefs.js';

/* ---------- Mascots: like ui.js's, plus the "calm mascot" preference ---------- */
export function mountMascots(root) {
  const made = [];
  const calm = getPrefs().calmMascot;
  root.querySelectorAll('[data-mascot]').forEach((slot) => {
    if (slot.dataset.mounted) return;
    slot.dataset.mounted = '';
    slot.setAttribute('aria-hidden', 'true');
    const size = slot.dataset.size || '';
    try {
      const handle = createConvoMascot(slot, {
        state: slot.dataset.mascot || 'idle',
        size: size.endsWith('%') ? size : Number(size) || 120,
        motion: calm ? 'still' : 'expressive',
      });
      made.push([slot, handle]);
    } catch (err) {
      console.warn('Convo mascot could not render:', err);
    }
  });
  return {
    get: (selector) => made.find(([slot]) => slot.matches(selector))?.[1],
    destroy: () => made.forEach(([, m]) => m.destroy()),
  };
}

/* ---------- Dates ---------- */
const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const formatDate = (iso) => { try { return dateFmt.format(new Date(iso)); } catch { return ''; } };

export const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`; };

export function relativeDay(iso) {
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 864e5);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(iso));
}

/* ---------- Controls ---------- */
export const switchControl = ({ id, label, help, on }) => `
  <div class="setting-row">
    <div class="setting-text">
      <p class="setting-label" id="${id}-label">${esc(label)}</p>
      ${help ? `<p class="setting-help" id="${id}-help">${esc(help)}</p>` : ''}
    </div>
    <button type="button" class="switch" role="switch" data-pref-switch="${id}" aria-checked="${on}"
      aria-labelledby="${id}-label"${help ? ` aria-describedby="${id}-help"` : ''}><span class="switch-knob"></span></button>
  </div>`;

/* ---------- Icons the app needs beyond ui.js (same stroke family) ---------- */
const svg = (body) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
export const APP_ICONS = {
  home: svg('<path d="M4 10.5L12 4l8 6.5"/><path d="M6 9v10h12V9"/><path d="M10 19v-5h4v5"/>'),
  reports: svg('<path d="M7 4h10a1 1 0 0 1 1 1v15l-3-2-3 2-3-2-3 2V5a1 1 0 0 1 1-1z"/><path d="M9.5 9h5M9.5 12.5h5"/>'),
  progress: svg('<path d="M4 19.5h16"/><path d="M7 16v-4M12 16V7M17 16v-6.5"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5"/>'),
  chat: svg('<path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M8.5 10.5h7"/>'),
  download: svg('<path d="M12 4v11M7 10.5l5 5 5-5"/><path d="M5 19.5h14"/>'),
  trash: svg('<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5"/><path d="M10 11v5M14 11v5"/>'),
  restart: svg('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 3.8v4.6h4.6"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  external: svg('<path d="M14 5h5v5M19 5l-8 8"/><path d="M17 14v4.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1h4.5"/>'),
};

/* Why they're learning: the ids onboarding saves, with the labels shown in the app. */
export const REASONS = [
  { id: 'travel', label: 'Preparing for a trip' },
  { id: 'study', label: 'Studying Mandarin' },
  { id: 'living', label: 'Living where Mandarin is spoken' },
  { id: 'people', label: 'Talking with family or friends' },
  { id: 'work', label: 'For work' },
  { id: 'fun', label: 'Just for fun' },
  { id: 'other', label: 'Something else' },
];
/** Labels for a list of reason ids, in REASONS order. */
export const reasonLabels = (ids = []) => REASONS.filter((r) => ids.includes(r.id)).map((r) => r.label);
