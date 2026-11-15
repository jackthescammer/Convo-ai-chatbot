import { esc, layered, bindLayerToggles, layerChips } from './ui.js';
import { mountMascots, relativeDay, reasonLabels, APP_ICONS } from './kit.js';
import { SCENARIOS } from './model.js';
import { getSettings, listReports, DIFFICULTY_LABEL } from './store.js';
import { getPrefs } from './prefs.js';
import { thisWeek, streak, totals, patterns } from './stats.js';
import { hasActiveSession, sessionProgress, resetSession, currentScenario } from './talk.js';

const ARROW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const GRID = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="4" width="6.5" height="6.5" rx="1.75"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.75"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.75"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.75"/></svg>';
const CLOSE = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';

/* A sample of how the barista talks, for the display preview. Interface copy, not model output. */
const SAMPLE = { zh: '你好，想喝点什么？', py: 'Nǐ hǎo, xiǎng hē diǎn shénme?', en: 'Hi, what can I get you?' };

function greeting(name) {
  const h = new Date().getHours();
  const part = h < 5 ? 'Hello' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${part}, ${name}.` : `${part}.`;
}

function continueCard(s, sc, resume, progress) {
  return `
  <article class="card-continue${sc.image ? ' has-scene' : ''}" aria-labelledby="continue-title">
    ${sc.image ? `<img class="continue-scene" src="${esc(sc.image)}" alt="" width="1600" height="900" decoding="async">` : ''}
    <span class="continue-mascot" data-mascot="${resume ? 'listening' : 'idle'}" data-size="116"></span>
    <div class="continue-copy">
      <h2 class="continue-title" id="continue-title">${esc(sc.title)}</h2>
      <ol class="continue-goals" aria-label="Goals">
        ${sc.goals.map((g) => {
          const done = resume && progress.goals[g.id];
          return `<li class="${done ? 'is-done' : ''}"><span class="goal-mark">${APP_ICONS.check}</span>${esc(g.label)}<span class="sr-only">${done ? ', done' : ''}</span></li>`;
        }).join('')}
      </ol>
      <div class="continue-actions">
        <a class="btn btn-primary" href="${resume ? '#/talk' : `#/talk/${esc(sc.id)}`}">${resume ? 'Resume conversation' : 'Start conversation'}</a>
        <button type="button" class="btn-quiet continue-pick" data-pick-open aria-haspopup="dialog">${GRID}Pick your conversation</button>
        ${resume ? '<button type="button" class="text-link link-btn" data-start-over>Start over</button>' : ''}
        <span class="continue-meta">
          <a class="meta-pill" href="#/settings/learning" aria-label="Level ${esc(s.level)}, change in settings">${esc(s.level)}</a>
          <a class="meta-pill" href="#/settings/learning" aria-label="Difficulty ${esc(DIFFICULTY_LABEL[s.difficulty])}, change in settings">${esc(DIFFICULTY_LABEL[s.difficulty])}</a>
          <span class="meta-plain">About 5 minutes</span>
        </span>
      </div>
    </div>
  </article>`;
}

/* "Pick your conversation": every conversation in a modal dialog. Scenes with a picture show as
   cards; one without (the open conversation) runs full width under them. Picking one starts it. */
function pickerDialog(s, current, resume) {
  return `
  <dialog class="picker" aria-labelledby="picker-title" aria-describedby="picker-lede" data-picker>
    <header class="picker-head">
      <div>
        <h2 class="picker-title" id="picker-title">Pick your conversation</h2>
        <p class="picker-lede" id="picker-lede">Convo plays the other person, at your level: ${esc(s.level)} · ${esc(DIFFICULTY_LABEL[s.difficulty])}.</p>
      </div>
      <button type="button" class="picker-close" data-pick-close aria-label="Close">${CLOSE}</button>
    </header>
    <div class="picker-body">
      <ul class="picks">
        ${SCENARIOS.map((x) => {
          const here = x.id === current.id;
          return `<li class="${x.image ? '' : 'is-wide'}">
          <a class="pick${here ? ' is-current' : ''}" href="${here && resume ? '#/talk' : `#/talk/${esc(x.id)}`}" data-pick${here ? ' aria-current="true"' : ''}>
            ${x.image
              ? `<img class="pick-img" src="${esc(x.image)}" alt="" width="1600" height="900" loading="lazy" decoding="async">`
              : `<span class="pick-word" lang="zh-Hans" aria-hidden="true">${esc(x.word)}</span>`}
            <span class="pick-copy">
              <span class="pick-title">${esc(x.title)}</span>
              <span class="pick-blurb">${esc(x.blurb)}</span>
            </span>
            ${here ? `<span class="pick-badge">${resume ? 'In progress' : 'Up next'}</span>` : ''}
          </a>
        </li>`;
        }).join('')}
      </ul>
      ${resume ? '<p class="picker-foot">Picking a different one ends the conversation in progress, without a report.</p>' : ''}
    </div>
  </dialog>`;
}

function bindPicker(root) {
  const dialog = root.querySelector('[data-picker]');
  const open = root.querySelector('[data-pick-open]');
  if (!dialog || !open) return () => {};
  // Browsers without showModal (older than 2022) still get the list, just not as a modal.
  open.addEventListener('click', () => (dialog.showModal ? dialog.showModal() : dialog.setAttribute('open', '')));
  root.querySelector('[data-pick-close]').addEventListener('click', () => dialog.close());
  // A press that starts and ends on the backdrop closes it; a drag out of the panel doesn't.
  let fromBackdrop = false;
  dialog.addEventListener('pointerdown', (e) => { fromBackdrop = e.target === dialog; });
  dialog.addEventListener('click', (e) => { if (fromBackdrop && e.target === dialog) dialog.close(); });
  // Picking navigates to the conversation; close first so the page underneath scrolls again.
  dialog.querySelectorAll('[data-pick]').forEach((a) => a.addEventListener('click', () => dialog.close()));
  return () => { if (dialog.open) dialog.close(); };
}

function weekCard(goal) {
  const week = thisWeek();
  const run = streak();
  const met = week.count >= goal;
  return `
  <section class="panel" aria-labelledby="week-title">
    <div class="panel-head">
      <h2 class="panel-title" id="week-title">This week</h2>
      <a class="panel-link" href="#/settings/learning">Change goal</a>
    </div>
    <p class="week-count"><strong>${Math.min(week.count, 99)} of ${goal}</strong> conversations${met ? ': goal reached' : ''}</p>
    <ol class="week" aria-label="Days this week">
      ${week.days.map((d) => `<li class="day${d.done ? ' is-done' : ''}${d.today ? ' is-today' : ''}${d.future ? ' is-future' : ''}">
        <span class="day-mark">${d.done ? APP_ICONS.check : ''}</span>
        <span class="day-name" aria-hidden="true">${esc(d.short)}</span>
        <span class="sr-only">${esc(d.long)}${d.today ? ' (today)' : ''}: ${d.done ? 'practised' : 'no conversation'}</span>
      </li>`).join('')}
    </ol>
    <p class="week-streak">${run ? `${run}-day streak. A short conversation tomorrow keeps it going.` : 'Finish a conversation today to start a streak.'}</p>
  </section>`;
}

function lastReportCard(reports) {
  if (!reports.length) {
    return `
    <section class="panel panel-empty" aria-labelledby="last-title">
      <h2 class="panel-title" id="last-title">Your latest report</h2>
      <div class="empty-inline">
        <span class="empty-mascot" data-mascot="reading" data-size="64"></span>
        <p>Nothing yet. After each conversation, Convo writes a report on what you said: corrections, why, and what to try next.</p>
      </div>
    </section>`;
  }
  const r = reports[0];
  const top = (r.fixes || [])[0];
  return `
  <section class="panel" aria-labelledby="last-title">
    <div class="panel-head">
      <h2 class="panel-title" id="last-title">Your latest report</h2>
      <span class="panel-meta">${esc(relativeDay(r.createdAt))}${r.placeholder ? ' · <span class="badge">Placeholder</span>' : ''}</span>
    </div>
    <p class="last-summary">${esc(r.summary)}</p>
    ${top && top.from && top.to ? `<div class="note last-note">
      <span class="tag tag-${esc(top.tag)}">${esc(top.label)}</span>
      <p class="note-change"><span class="from" lang="zh-Hans">${esc(top.from)}</span>${ARROW}<span class="to" lang="zh-Hans">${esc(top.to)}</span></p>
    </div>` : ''}
    <a class="text-link" href="#/report/${esc(r.id)}">Read the report</a>
  </section>`;
}

function patternsCard(list) {
  return `
  <section class="panel" aria-labelledby="patterns-title">
    <h2 class="panel-title" id="patterns-title">Patterns to watch</h2>
    ${list.length ? `<ol class="patterns">${list.slice(0, 4).map((p) => `<li>
      <span class="tag tag-${esc(p.tag)}">${esc(p.label)}</span>
      <span class="pattern-title">${esc(p.title)}</span>
      <span class="pattern-count">${p.count === 1 ? 'Once' : `${p.count} times`}</span>
    </li>`).join('')}</ol>
    <p class="panel-foot">From every report on this device. The ones that keep coming up are worth a look before your next conversation.</p>`
    : '<p class="panel-text">Corrections that keep coming up across your reports will show here.</p>'}
  </section>`;
}

function practiceCard() {
  const t = totals();
  const rows = [
    ['Conversations finished', t.conversations],
    ['Messages in Mandarin', t.messages ? `${t.mandarin} of ${t.messages}` : '0'],
    ['Goals reached', t.goals],
    ['Surprises handled', t.surprises],
  ];
  return `
  <section class="panel" aria-labelledby="practice-title">
    <h2 class="panel-title" id="practice-title">Your practice</h2>
    <dl class="stat-rows">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(String(v))}</dd></div>`).join('')}</dl>
  </section>`;
}

function setupCard(s) {
  const reason = reasonLabels(s.reasons).join(', ');
  return `
  <section class="panel" aria-labelledby="setup-title" data-hint-scope>
    <div class="panel-head">
      <h2 class="panel-title" id="setup-title">Your setup</h2>
      <a class="panel-link" href="#/settings">Settings</a>
    </div>
    <dl class="stat-rows">
      <div><dt>Level</dt><dd>${esc(s.level)}</dd></div>
      <div><dt>Difficulty</dt><dd>${esc(DIFFICULTY_LABEL[s.difficulty])}</dd></div>
      ${reason ? `<div><dt>Learning for</dt><dd>${esc(reason)}</dd></div>` : ''}
    </dl>
    <div class="setup-preview">
      <div class="bubble">${layered(SAMPLE)}</div>
      ${layerChips('Show in conversations')}
      <p class="toggle-hint" data-toggle-hint aria-live="polite"></p>
    </div>
  </section>`;
}

export function render(root) {
  const s = getSettings();
  const p = getPrefs();
  const reports = listReports();
  const resume = hasActiveSession();
  const progress = sessionProgress();
  const sc = currentScenario();

  root.innerHTML = `
  <div class="page dash">
    ${!s.onboarded ? `<aside class="setup-nudge" aria-label="Setup">
      <p><strong>Set Convo to your level.</strong> Five quick questions, then it talks at the right pace for you.</p>
      <a class="btn btn-small btn-quiet-solid" href="./#/hello">Start setup</a>
    </aside>` : ''}
    <header class="page-head">
      <h1 class="page-title">${esc(greeting(p.name.trim()))}</h1>
    </header>

    <div class="dash-grid">
      <div class="dash-main">
        ${continueCard(s, sc, resume, progress)}
        ${lastReportCard(reports)}
        ${patternsCard(patterns(reports))}
      </div>
      <div class="dash-side">
        ${weekCard(p.weeklyGoal)}
        ${practiceCard()}
        ${setupCard(s)}
      </div>
    </div>

    <p class="soon"><span class="soon-mascot" data-mascot="listening" data-size="40"></span>Coming next: spoken replies, so you hear Convo say every line out loud.</p>
    ${pickerDialog(s, sc, resume)}
  </div>`;

  const mascots = mountMascots(root);
  const unbind = bindLayerToggles(root);
  const unbindPicker = bindPicker(root);
  root.querySelector('[data-start-over]')?.addEventListener('click', () => {
    resetSession();
    location.hash = `#/talk/${sc.id}`;
  });
  return () => { unbindPicker(); unbind(); mascots.destroy(); };
}
