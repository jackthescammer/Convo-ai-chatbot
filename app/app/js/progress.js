/* Progress: how the learner's mistakes change from one conversation to the next.
   Worked out from the reports saved in this browser (store.js); nothing is estimated or sent anywhere. */

import { esc } from './ui.js';
import { mountMascots, formatDate, APP_ICONS } from './kit.js';
import { listReports } from './store.js';

/* The correction types a report can contain, in the order they stack in the chart. */
export const KINDS = [
  { tag: 'grammar', label: 'Grammar', color: 'var(--pulse)' },
  { tag: 'vocab', label: 'Vocabulary', color: 'var(--fathom)' },
  { tag: 'natural', label: 'More natural', color: 'var(--mark)' },
];

const shortDate = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });

/** One row per report, oldest first: messages sent, corrections by type, and the share of messages corrected. */
export function progressRows(reports = listReports()) {
  return reports
    .slice()
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((r, i) => {
      const messages = (r.transcript || []).filter((l) => l.who === 'you').length;
      const counts = Object.fromEntries(KINDS.map((k) => [k.tag, 0]));
      (r.fixes || []).forEach((f) => { if (f.tag in counts) counts[f.tag] += 1; });
      const total = KINDS.reduce((n, k) => n + counts[k.tag], 0);
      return {
        id: r.id, n: i + 1, createdAt: r.createdAt, messages, counts, total,
        // shortcut: one correction is counted as one corrected message; a message with two corrections would push this past 100%, so it is capped
        rate: messages ? Math.min(1, total / messages) : null,
      };
    });
}

const pct = (x) => (x === null ? 'n/a' : `${Math.round(x * 100)}%`);

/* Plain-language comparison of the first and latest conversation. Only says what the numbers show. */
function trendText(rows) {
  if (rows.length < 2) return 'Finish another conversation to see how your mistakes change over time.';
  const first = rows[0];
  const last = rows[rows.length - 1];
  if (first.rate === null || last.rate === null) return 'Some conversations had no messages from you, so there is nothing to compare yet.';
  const d = Math.round((last.rate - first.rate) * 100);
  if (d < 0) return `Fewer mistakes: ${pct(last.rate)} of your messages needed a correction in your latest conversation, down from ${pct(first.rate)} in your first.`;
  if (d > 0) return `${pct(last.rate)} of your messages needed a correction in your latest conversation, up from ${pct(first.rate)} in your first. Harder conversations often bring more mistakes; the table below shows where they came from.`;
  return `The same share of your messages needed a correction in your first and latest conversation (${pct(last.rate)}).`;
}

function mostCommon(rows) {
  const sums = KINDS.map((k) => ({ ...k, n: rows.reduce((s, r) => s + r.counts[k.tag], 0) }));
  const top = sums.sort((a, b) => b.n - a.n)[0];
  return top.n ? top : null;
}

/* Stacked bars: one per conversation, split by correction type. The table below holds the same numbers. */
function chart(rows) {
  const W = 640, H = 260, left = 36, right = 12, top = 16, bottom = 40;
  const max = Math.max(1, ...rows.map((r) => r.total));
  const step = max <= 5 ? 1 : max <= 10 ? 2 : 5;
  const ceil = Math.ceil(max / step) * step;
  const plotW = W - left - right, plotH = H - top - bottom;
  const slot = plotW / rows.length;
  const barW = Math.min(56, slot * 0.6);
  const y = (v) => top + plotH - (v / ceil) * plotH;

  const grid = [];
  for (let v = 0; v <= ceil; v += step) {
    grid.push(`<line x1="${left}" x2="${W - right}" y1="${y(v)}" y2="${y(v)}" class="pg-grid${v === 0 ? ' pg-axis' : ''}"/>`,
      `<text x="${left - 8}" y="${y(v) + 4}" class="pg-tick" text-anchor="end">${v}</text>`);
  }

  const bars = rows.map((r, i) => {
    const x = left + slot * i + (slot - barW) / 2;
    let base = 0;
    const parts = KINDS.map((k) => {
      const v = r.counts[k.tag];
      if (!v) return '';
      const rect = `<rect x="${x}" y="${y(base + v)}" width="${barW}" height="${y(base) - y(base + v)}" fill="${k.color}" rx="3"/>`;
      base += v;
      return rect;
    }).join('');
    const label = `Conversation ${r.n}, ${formatDate(r.createdAt)}: ${r.total} correction${r.total === 1 ? '' : 's'} in ${r.messages} message${r.messages === 1 ? '' : 's'}`;
    return `<g class="pg-bar"><title>${esc(label)}</title>
      ${parts || `<rect x="${x}" y="${y(0) - 2}" width="${barW}" height="2" class="pg-zero"/>`}
      <text x="${x + barW / 2}" y="${y(r.total) - 6}" class="pg-value" text-anchor="middle">${r.total}</text>
      <text x="${x + barW / 2}" y="${H - bottom + 18}" class="pg-label" text-anchor="middle">#${r.n}</text>
      <text x="${x + barW / 2}" y="${H - bottom + 33}" class="pg-sub" text-anchor="middle">${esc(shortDate.format(new Date(r.createdAt)))}</text>
    </g>`;
  }).join('');

  return `<svg class="pg-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Corrections in each conversation, split by type. The same numbers are in the table below.">
    ${grid.join('')}${bars}
  </svg>`;
}

function legend() {
  return `<ul class="pg-legend">${KINDS.map((k) => `<li><span class="pg-swatch" style="background:${k.color}"></span>${esc(k.label)}</li>`).join('')}</ul>`;
}

function table(rows) {
  return `<div class="pg-table-wrap" tabindex="0" role="region" aria-label="Mistakes in every conversation">
    <table class="pg-table">
      <thead><tr>
        <th scope="col">Conversation</th>
        <th scope="col" class="num">Messages</th>
        ${KINDS.map((k) => `<th scope="col" class="num">${esc(k.label)}</th>`).join('')}
        <th scope="col" class="num">Total</th>
        <th scope="col" class="num">Messages corrected</th>
        <th scope="col"><span class="sr-only">Report</span></th>
      </tr></thead>
      <tbody>${rows.slice().reverse().map((r) => `<tr>
        <th scope="row"><span class="pg-n">#${r.n}</span> ${esc(formatDate(r.createdAt))}</th>
        <td class="num">${r.messages}</td>
        ${KINDS.map((k) => `<td class="num">${r.counts[k.tag] || '<span class="pg-dash">0</span>'}</td>`).join('')}
        <td class="num"><strong>${r.total}</strong></td>
        <td class="num">${pct(r.rate)}</td>
        <td><a class="pg-open" href="#/report/${esc(r.id)}">Open<span class="sr-only"> report ${r.n}</span>${APP_ICONS.arrow}</a></td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`;
}

export function render(root) {
  const rows = progressRows();
  if (!rows.length) {
    root.innerHTML = `
    <div class="page">
      <header class="page-head"><h1 class="page-title">Your progress.</h1></header>
      <div class="empty">
        <span class="empty-mascot" data-mascot="reading" data-size="72"></span>
        <div>
          <p><strong>Nothing to chart yet.</strong> After each conversation, your mistakes are counted here, so you can see them shrink over time.</p>
          <a class="btn btn-primary btn-small" href="#/talk">Start a conversation</a>
        </div>
      </div>
    </div>`;
    const m = mountMascots(root);
    return () => m.destroy();
  }

  const first = rows[0], last = rows[rows.length - 1];
  const top = mostCommon(rows);
  root.innerHTML = `
  <div class="page progress">
    <header class="page-head">
      <h1 class="page-title">Your progress.</h1>
      <p class="page-lede">How your mistakes change from one conversation to the next, worked out from the reports saved in this browser.</p>
    </header>

    <dl class="pg-stats">
      <div class="panel"><dt>Conversations</dt><dd>${rows.length}</dd></div>
      <div class="panel"><dt>Messages corrected</dt><dd>${rows.length > 1 ? `${pct(first.rate)} <span class="pg-arrow" aria-label="then">${APP_ICONS.arrow}</span> ${pct(last.rate)}` : pct(last.rate)}</dd><dd class="pg-stat-note">${rows.length > 1 ? 'First conversation, then latest' : 'In your one conversation'}</dd></div>
      <div class="panel"><dt>Most common</dt><dd>${top ? `<span class="tag tag-${esc(top.tag)}">${esc(top.label)}</span>` : 'None yet'}</dd><dd class="pg-stat-note">${top ? `${top.n} correction${top.n === 1 ? '' : 's'} so far` : 'No corrections so far'}</dd></div>
    </dl>

    <section class="panel pg-panel" aria-labelledby="pg-chart-title">
      <div class="panel-head">
        <h2 class="panel-title" id="pg-chart-title">Mistakes in each conversation</h2>
        ${legend()}
      </div>
      ${chart(rows)}
      <p class="pg-trend">${esc(trendText(rows))}</p>
    </section>

    <section class="panel pg-panel" aria-labelledby="pg-table-title">
      <h2 class="panel-title" id="pg-table-title">Every report</h2>
      ${table(rows)}
      <p class="panel-foot">Counts come from each report's corrections. Longer conversations have more chances for mistakes, so "Messages corrected" is the fairest way to compare.</p>
    </section>
  </div>`;
  return null;
}
