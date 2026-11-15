import { esc, layered, bindLayerToggles, layerChips } from './ui.js';
import { mountMascots, formatDate } from './kit.js';
import { getReport, DIFFICULTY_LABEL } from './store.js';
import { resetSession } from './talk.js';
import { rewardFor, wasAwarded, MIN_MESSAGES } from './wallet.js';
import { COIN } from './shop.js';

const CJK = /[㐀-鿿]/;

/* A sentence that may only have 汉字 (no pinyin or English): shown as plain text so
   switching the 汉字 layer off never hides it completely. */
function sentence(line, mark) {
  if (line.py || line.en) return layered(line, { mark });
  let zh = esc(line.zh);
  if (mark && line.zh.includes(mark)) zh = zh.replace(esc(mark), `<mark>${esc(mark)}</mark>`);
  return `<p class="plain-zh"${CJK.test(line.zh) ? ' lang="zh-Hans"' : ''}>${zh}</p>`;
}

function fixBlock(f) {
  return `<div class="fix">
    <div class="fix-head"><h3>${esc(f.title || f.label)}</h3><span class="tag tag-${esc(f.tag)}">${esc(f.label)}</span></div>
    <dl class="fix-rows">
      <dt>You said</dt>
      <dd class="said">${sentence({ zh: f.said }, f.mark)}</dd>
      ${f.better ? `<dt>Better</dt><dd class="better">${sentence(f.better)}</dd>` : ''}
      ${f.why ? `<dt>Why</dt><dd class="why">${esc(f.why)}</dd>` : ''}
    </dl>
  </div>`;
}

function transcript(lines) {
  return `<details class="transcript">
    <summary>Full conversation</summary>
    <ol class="transcript-list">${lines.map((l) => `<li class="t-line t-${l.who}">
      <span class="t-who">${l.who === 'ai' ? 'Convo' : 'You'}</span>
      ${l.who === 'ai' ? layered(l) : sentence({ zh: l.zh })}
    </li>`).join('')}</ol>
  </details>`;
}

function coinNote(r) {
  const pay = rewardFor(r);
  if (pay.total && wasAwarded(r.id)) {
    const parts = [`${pay.base} for finishing`];
    if (pay.goals) parts.push(`${pay.goals} for ${pay.done} goal${pay.done === 1 ? '' : 's'}`);
    return `<p class="coin-note">${COIN}<span><strong>+${pay.total} coins</strong> <span class="coin-note-sub">${esc(parts.join(' + '))}.</span> <a class="text-link" href="#/shop">Spend them</a></span></p>`;
  }
  if (!pay.total) return `<p class="coin-note is-none">${COIN}<span>No coins this time. Say at least ${MIN_MESSAGES} things in a conversation to earn them.</span></p>`;
  return '';
}

export function render(root, { arg }) {
  const r = getReport(arg);
  if (!r) {
    root.innerHTML = `<div class="wrap missing">
      <span data-mascot="curious" data-size="120"></span>
      <h1 class="page-title">This report isn't here.</h1>
      <p class="page-lede">Reports are kept in this browser only, so it may have been cleared or written on another device.</p>
      <a class="btn btn-primary" href="#/home">Back to conversations</a>
    </div>`;
    const m = mountMascots(root);
    return () => m.destroy();
  }

  const diff = DIFFICULTY_LABEL[r.difficulty] || '';
  const surprises = (r.notes || []).filter((n) => n.tag === 'surprise');
  const goalsDone = (r.goals || []).filter((g) => g.done).length;

  root.innerHTML = `
  <section class="section section-dawn report-page" aria-labelledby="report-page-title">
    <div class="wrap report-layout">
      <div class="report-copy" data-hint-scope>
        <h1 class="h2" id="report-page-title">How it went.</h1>
        <p class="report-when">${esc(r.scenario)} · ${esc(r.level)} · ${esc(diff)} · ${esc(formatDate(r.createdAt))}</p>
        <dl class="assess">
          ${(r.goals || []).length ? `<div><dt>Goals</dt><dd>${goalsDone} of ${r.goals.length} reached</dd></div>` : ''}
          ${r.assessment.map((a) => `<div><dt>${esc(a.label)}</dt><dd>${esc(a.value)}</dd></div>`).join('')}
        </dl>
        ${coinNote(r)}
        <div class="report-actions">
          <a class="btn btn-primary" href="#/talk" data-again>Practise again</a>
          <a class="text-link" href="#/home">Back to conversations</a>
        </div>
        <div class="report-layers">
          ${layerChips('Show in this report')}
          <p class="toggle-hint" data-toggle-hint aria-live="polite"></p>
        </div>
        <div class="report-mascot" data-mascot="report" data-size="150"></div>
      </div>

      <article class="report" aria-labelledby="report-title">
        <header class="report-head">
          <h2 id="report-title">${esc(r.scenario)}</h2>
          <p class="report-meta">${r.placeholder ? '<span class="badge">Placeholder</span>' : ''} ${esc(r.level)}, ${esc(diff)}</p>
        </header>

        <p class="report-summary">${esc(r.summary)}</p>

        ${(r.goals || []).length ? `<ul class="report-goals" aria-label="Goals">
          ${r.goals.map((g) => `<li class="${g.done ? 'is-done' : ''}"><span class="goal-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>${esc(g.label)}<span class="sr-only">${g.done ? ', reached' : ', not reached'}</span></li>`).join('')}
        </ul>` : ''}

        ${r.fixes.map(fixBlock).join('')}

        ${surprises.map((n) => `<div class="fix">
          <div class="fix-head"><h3>When something unexpected happened</h3><span class="tag tag-surprise">${esc(n.label)}</span></div>
          <p class="why fix-text">${esc(n.text || '')}</p>
        </div>`).join('')}

        ${r.leftAlone.map((l) => `<div class="fix fix-ok">
          <div class="fix-head"><h3>Correct as it was</h3><span class="tag tag-ok">Left alone</span></div>
          <div class="ok-line">${sentence(l)}</div>
          <p class="why">Nothing to change.</p>
        </div>`).join('')}

        ${!r.fixes.length ? `<div class="fix fix-ok">
          <div class="fix-head"><h3>Nothing flagged</h3><span class="tag tag-ok">All clear</span></div>
          <p class="why fix-text">No mistakes were picked up in this conversation.</p>
        </div>` : ''}

        <footer class="report-foot">
          <div><h3>Pattern to watch</h3><p>${esc(r.pattern || 'Nothing came up more than once.')}</p></div>
          <div><h3>Try next</h3><p>${esc(r.next || 'Have another conversation at the same level.')}</p></div>
        </footer>

        ${transcript(r.transcript || [])}

        ${r.placeholder ? `<p class="report-caveat">Written by the placeholder model. It only checks for three common mistakes and its replies didn't respond to what you wrote. The connected model writes the full report.</p>` : ''}
        ${!r.placeholder && r.caveat ? `<p class="report-caveat">${esc(r.caveat)}${r.model ? ` Model: ${esc(r.model)}.` : ''}</p>` : ''}
      </article>
    </div>
  </section>`;

  const mascots = mountMascots(root);
  const unbind = bindLayerToggles(root);
  root.querySelector('[data-again]').addEventListener('click', () => resetSession());
  return () => { unbind(); mascots.destroy(); };
}
