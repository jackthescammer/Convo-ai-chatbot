/* Numbers for the dashboard, worked out from the reports on this device. Nothing is estimated:
   if there are no reports, every figure is zero and the dashboard says so. */

import { listReports } from './store.js';
import { dayKey, startOfDay } from './kit.js';

const CJK = /[㐀-鿿]/;

/** Monday-first days of the current week, each marked if a conversation was finished that day. */
export function thisWeek(reports = listReports()) {
  const today = startOfDay(new Date());
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const done = new Set(reports.map((r) => dayKey(r.createdAt)));
  const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' });
  const long = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { short: fmt.format(d), long: long.format(d), done: done.has(dayKey(d)), today: +d === +today, future: d > today };
  });
  const count = reports.filter((r) => new Date(r.createdAt) >= monday).length;
  return { days, count };
}

/** Days in a row with at least one finished conversation, counting back from today (or yesterday). */
export function streak(reports = listReports()) {
  const done = new Set(reports.map((r) => dayKey(r.createdAt)));
  const d = startOfDay(new Date());
  if (!done.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (done.has(dayKey(d))) { n += 1; d.setDate(d.getDate() - 1); }
  return n;
}

export function totals(reports = listReports()) {
  let messages = 0;
  let mandarin = 0;
  let surprises = 0;
  let goals = 0;
  reports.forEach((r) => {
    (r.transcript || []).filter((l) => l.who === 'you').forEach((l) => {
      messages += 1;
      if (CJK.test(l.zh || '')) mandarin += 1;
    });
    surprises += (r.notes || []).filter((n) => n.tag === 'surprise').length;
    goals += (r.goals || []).filter((g) => g.done).length;
  });
  return { conversations: reports.length, messages, mandarin, surprises, goals };
}

/** Corrections that came up in more than one place, most frequent first. */
export function patterns(reports = listReports()) {
  const byTitle = new Map();
  reports.forEach((r) => (r.fixes || []).forEach((f) => {
    const key = f.title || f.label;
    const p = byTitle.get(key) || { title: key, tag: f.tag, label: f.label, count: 0, from: f.from, to: f.to, lastSeen: r.createdAt };
    p.count += 1;
    byTitle.set(key, p);
  }));
  return [...byTitle.values()].sort((a, b) => b.count - a.count || (a.lastSeen < b.lastSeen ? 1 : -1));
}
