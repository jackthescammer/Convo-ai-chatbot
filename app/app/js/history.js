import { esc } from './ui.js';
import { mountMascots, formatDate, APP_ICONS } from './kit.js';
import { listReports, DIFFICULTY_LABEL } from './store.js';

export function rows(reports) {
  return `<ol class="report-rows">${reports.map((r) => {
    const fixes = r.fixes?.length || 0;
    const goals = (r.goals || []).filter((g) => g.done).length;
    return `<li><a class="report-row" href="#/report/${esc(r.id)}">
      <span class="rr-main">
        <span class="rr-title">${esc(r.scenario)}</span>
        <span class="rr-meta">${esc(formatDate(r.createdAt))} · ${esc(r.level)} · ${esc(DIFFICULTY_LABEL[r.difficulty] || '')}</span>
      </span>
      <span class="rr-tags">
        ${fixes ? `<span class="tag tag-grammar">${fixes} to look at</span>` : '<span class="tag tag-ok">Nothing flagged</span>'}
        <span class="rr-goals">${goals} of ${(r.goals || []).length} goals</span>
      </span>
      <span class="rr-arrow">${APP_ICONS.arrow}</span>
    </a></li>`;
  }).join('')}</ol>`;
}

export function render(root) {
  const reports = listReports();
  root.innerHTML = `
  <div class="page">
    <header class="page-head">
      <h1 class="page-title">Your reports.</h1>
      <p class="page-lede">Every finished conversation, newest first. They're kept on this device only. You can export them from Settings.</p>
    </header>
    ${reports.length ? rows(reports) : `
      <div class="empty">
        <span class="empty-mascot" data-mascot="reading" data-size="72"></span>
        <div>
          <p><strong>No reports yet.</strong> Finish a conversation and its report appears here, with every sentence worth fixing.</p>
          <a class="btn btn-primary btn-small" href="#/talk">Start a conversation</a>
        </div>
      </div>`}
  </div>`;
  const m = mountMascots(root);
  return () => m.destroy();
}
