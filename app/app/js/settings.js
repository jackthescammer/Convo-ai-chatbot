import { esc, layered, bindLayerToggles, layerChips, setLayer, LAYERS } from './ui.js';
import { mountMascots, switchControl, APP_ICONS, REASONS } from './kit.js';
import { getSettings, saveSettings, listReports, clearAll } from './store.js';
import { getPrefs, savePrefs, resetPrefs } from './prefs.js';
import { MODEL_INFO } from './model.js';
import { resetSession, hasActiveSession } from './talk.js';

const SECTIONS = [
  ['profile', 'Profile'],
  ['setup', 'Setup'],
  ['learning', 'Learning'],
  ['display', 'Display'],
  ['conversation', 'Conversation'],
  ['data', 'Your data'],
  ['about', 'About'],
];

const LEVEL_HELP = {
  A1: 'Just starting: greetings, numbers and a few useful words.',
  A2: 'Getting by: simple requests and short everyday answers.',
};
const DIFF_HELP = {
  easy: 'Short questions, one thing at a time, everyday words.',
  standard: 'Natural pace, with follow-up questions you have to answer.',
  challenging: "Longer sentences, new words and suggestions you didn't ask for.",
};
const SAMPLE = { zh: '不好意思，燕麦奶卖完了。牛奶可以吗？', py: 'Bù hǎoyìsi, yànmài nǎi mài wán le. Niúnǎi kěyǐ ma?', en: "Sorry, we're out of oat milk. Is regular milk OK?" };

const seg = (name, options, value, label) => `
  <div class="seg" role="radiogroup" aria-label="${esc(label)}">
    ${options.map(([v, text]) => `<label><input type="radio" name="${name}" value="${esc(v)}"${String(value) === String(v) ? ' checked' : ''}><span>${esc(text)}</span></label>`).join('')}
  </div>`;

/* The Setup section links into onboarding on ./ (index.html). A single step opened with
   ?from=settings shows Save, then returns to #/settings/setup. */
function template(s, p) {
  const reports = listReports().length;
  return `
  <div class="page settings">
    <header class="page-head">
      <h1 class="page-title">Settings.</h1>
      <p class="page-lede">Changes save as you make them, on this device only. There's no account.</p>
    </header>

    <div class="settings-layout">
      <nav class="settings-nav" aria-label="Settings sections">
        <ol>${SECTIONS.map(([id, label]) => `<li><a href="#/settings/${id}" data-section-link="${id}">${esc(label)}</a></li>`).join('')}</ol>
      </nav>

      <div class="settings-body">
        <section class="set-group" id="set-profile" aria-labelledby="h-profile">
          <h2 class="set-title" id="h-profile">Profile</h2>
          <div class="set-card">
            <div class="setting-row setting-row-stack">
              <div class="setting-text">
                <label class="setting-label" for="pref-name">What should Convo call you?</label>
                <p class="setting-help" id="pref-name-help">Used in the greeting on your dashboard. Optional.</p>
              </div>
              <input class="text-input" id="pref-name" type="text" maxlength="30" autocomplete="given-name"
                value="${esc(p.name)}" placeholder="Your first name" aria-describedby="pref-name-help">
            </div>
          </div>
        </section>

        <section class="set-group" id="set-setup" aria-labelledby="h-setup">
          <h2 class="set-title" id="h-setup">Setup</h2>
          <div class="set-card">
            <div class="setting-row">
              <div class="setting-text">
                <p class="setting-label">Go through setup again</p>
                <p class="setting-help">Convo asks why you're learning, how much you know, what to show and how hard to push. Your reports stay.</p>
              </div>
              <a class="btn-line" href="./#/hello">${APP_ICONS.restart}Start setup</a>
            </div>
            <div class="setting-row">
              <div class="setting-text">
                <p class="setting-label">Not sure of your level?</p>
                <p class="setting-help">Read two things the barista might say and choose which you could answer. Your level updates to match.</p>
              </div>
              <a class="btn-line" href="./#/check?from=settings">${APP_ICONS.chat}Check my level</a>
            </div>
          </div>
        </section>

        <section class="set-group" id="set-learning" aria-labelledby="h-learning">
          <h2 class="set-title" id="h-learning">Learning</h2>
          <div class="set-card">
            <div class="setting-row setting-row-stack">
              <div class="setting-text">
                <p class="setting-label" id="lbl-level">Level</p>
                <p class="setting-help" data-level-help>${esc(LEVEL_HELP[s.level])}</p>
              </div>
              ${seg('level', [['A1', 'A1'], ['A2', 'A2']], s.level, 'Level')}
            </div>
            <div class="setting-row setting-row-stack">
              <div class="setting-text">
                <p class="setting-label">Difficulty</p>
                <p class="setting-help" data-diff-help>${esc(DIFF_HELP[s.difficulty])}</p>
              </div>
              ${seg('difficulty', [['easy', 'Easy'], ['standard', 'Standard'], ['challenging', 'Challenging']], s.difficulty, 'Difficulty')}
            </div>
            <div class="setting-row setting-row-stack">
              <div class="setting-text">
                <p class="setting-label" id="lbl-reasons">Why you're learning</p>
                <p class="setting-help">From setup. Helps Convo pick what to practise next.</p>
              </div>
              <div class="reason-chips" role="group" aria-labelledby="lbl-reasons">
                ${REASONS.map((r) => `<button type="button" class="chip" data-reason="${r.id}" aria-pressed="${s.reasons.includes(r.id)}">${esc(r.label)}</button>`).join('')}
              </div>
            </div>
            <div class="setting-row setting-row-stack">
              <div class="setting-text">
                <p class="setting-label">Weekly goal</p>
                <p class="setting-help">How many conversations you'd like to have each week. Shown on your dashboard.</p>
              </div>
              ${seg('weeklyGoal', [[1, '1'], [3, '3'], [5, '5'], [7, 'Every day']], p.weeklyGoal, 'Conversations a week')}
            </div>
            <p class="set-note" data-active-note${hasActiveSession() ? '' : ' hidden'}>Level and difficulty apply from your next conversation. The one in progress keeps its settings.</p>
          </div>
        </section>

        <section class="set-group" id="set-display" aria-labelledby="h-display">
          <h2 class="set-title" id="h-display">Display</h2>
          <div class="set-card" data-hint-scope>
            <div class="setting-row setting-row-stack">
              <div class="setting-text">
                <p class="setting-label">Show in conversations</p>
                <p class="setting-help">Switch layers on or off. You can also change them during a conversation.</p>
              </div>
              ${layerChips('Show in conversations')}
              <p class="toggle-hint" data-toggle-hint aria-live="polite"></p>
            </div>
            <div class="setting-row setting-row-stack">
              <div class="setting-text">
                <p class="setting-label">Chinese text size</p>
                <p class="setting-help">For characters in conversations and reports.</p>
              </div>
              ${seg('zhSize', [['standard', 'Standard'], ['large', 'Large']], p.zhSize, 'Chinese text size')}
            </div>
            <div class="display-preview" aria-label="Preview">
              <p class="msg-who"><span class="avatar" data-mascot="talking" data-size="40"></span>Convo <span class="msg-role">as the barista</span></p>
              <div class="bubble">${layered(SAMPLE)}</div>
            </div>
          </div>
        </section>

        <section class="set-group" id="set-conversation" aria-labelledby="h-conversation">
          <h2 class="set-title" id="h-conversation">Conversation</h2>
          <div class="set-card">
            ${switchControl({ id: 'showNotes', label: 'Show notes while I talk', help: 'Convo saves corrections as you go. Turn this off to see them only in your report.', on: p.showNotes })}
            ${switchControl({ id: 'showHelp', label: 'Show "Help me reply"', help: 'Suggested phrases you can tap into the reply box and change.', on: p.showHelp })}
            ${switchControl({ id: 'enterToSend', label: 'Enter sends my reply', help: 'When off, Enter starts a new line and the send button sends.', on: p.enterToSend })}
            ${switchControl({ id: 'calmMascot', label: 'Calm mascot', help: 'Convo holds one pose for each moment instead of animating. Reduced motion settings on your device always do this.', on: p.calmMascot })}
          </div>
        </section>

        <section class="set-group" id="set-data" aria-labelledby="h-data">
          <h2 class="set-title" id="h-data">Your data</h2>
          <div class="set-card">
            <div class="setting-row">
              <div class="setting-text">
                <p class="setting-label">Export reports</p>
                <p class="setting-help">${reports ? `Download your ${reports} report${reports === 1 ? '' : 's'} as a JSON file.` : 'No reports to export yet.'}</p>
              </div>
              <button type="button" class="btn-line" data-export${reports ? '' : ' disabled'}>${APP_ICONS.download}Export</button>
            </div>
            <div class="setting-row">
              <div class="setting-text">
                <p class="setting-label">Delete reports</p>
                <p class="setting-help">Removes every report from this device. Settings stay.</p>
              </div>
              <button type="button" class="btn-line btn-danger" data-delete-reports${reports ? '' : ' disabled'}>${APP_ICONS.trash}<span>Delete</span></button>
            </div>
            <div class="setting-row">
              <div class="setting-text">
                <p class="setting-label">Reset everything</p>
                <p class="setting-help">Deletes reports, setup answers and these settings, then starts setup from the beginning.</p>
              </div>
              <button type="button" class="btn-line btn-danger" data-reset>${APP_ICONS.trash}<span>Reset</span></button>
            </div>
          </div>
        </section>

        <section class="set-group" id="set-about" aria-labelledby="h-about">
          <h2 class="set-title" id="h-about">About</h2>
          <div class="set-card">
            <dl class="stat-rows about-rows">
              <div><dt>Conversation model</dt><dd>${MODEL_INFO.connected ? esc(MODEL_INFO.name) : 'Placeholder, not connected'}</dd></div>
              <div><dt>Where your data lives</dt><dd>This browser only</dd></div>
              <div><dt>Scenarios</dt><dd>Ordering at a café</dd></div>
            </dl>
            ${MODEL_INFO.connected ? '' : `<p class="set-note">Replies in this demo come from a placeholder: they follow a fixed order and don't respond to what you write. The real model (Qwen2.5-3B-Instruct) runs separately.</p>`}
            <p class="about-links"><a class="text-link" href="../landing/index.html">Convo home page ${APP_ICONS.external}</a></p>
          </div>
        </section>
      </div>
    </div>
    <p class="toast" data-toast role="status" aria-live="polite"></p>
  </div>`;
}

export function render(root, { arg }) {
  root.innerHTML = template(getSettings(), getPrefs());
  const q = (sel) => root.querySelector(sel);
  const mascots = mountMascots(root);
  const unbindLayers = bindLayerToggles(root);
  const toast = q('[data-toast]');
  let toastTimer;
  const saved = (text = 'Saved') => {
    toast.textContent = text;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.classList.remove('is-on'); }, 1600);
  };

  /* Radios: setup fields go to store.js, the rest to prefs.js */
  root.addEventListener('change', (e) => {
    const { name, value } = e.target;
    if (name === 'level') {
      saveSettings({ level: value });
      q('[data-level-help]').textContent = LEVEL_HELP[value];
    } else if (name === 'difficulty') {
      saveSettings({ difficulty: value, difficultyPicked: true });
      q('[data-diff-help]').textContent = DIFF_HELP[value];
    } else if (name === 'weeklyGoal') {
      savePrefs({ weeklyGoal: Number(value) });
    } else if (name === 'zhSize') {
      savePrefs({ zhSize: value });
    } else return;
    saved();
  });

  root.querySelectorAll('[data-reason]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const on = chip.getAttribute('aria-pressed') !== 'true';
      chip.setAttribute('aria-pressed', String(on));
      const reasons = [...root.querySelectorAll('[data-reason][aria-pressed="true"]')].map((c) => c.dataset.reason);
      saveSettings({ reasons });
      saved();
    });
  });

  let nameTimer;
  q('#pref-name').addEventListener('input', (e) => {
    clearTimeout(nameTimer);
    nameTimer = setTimeout(() => { savePrefs({ name: e.target.value.trim() }); saved(); }, 400);
  });

  root.querySelectorAll('[data-pref-switch]').forEach((sw) => {
    sw.addEventListener('click', () => {
      const on = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', String(on));
      savePrefs({ [sw.dataset.prefSwitch]: on });
      saved(sw.dataset.prefSwitch === 'calmMascot' ? 'Saved. Applies on the next screen.' : 'Saved');
    });
  });

  /* Layer chips save through ui.js; just confirm it */
  root.querySelector('.layer-toggle').addEventListener('click', () => saved());

  /* Data */
  q('[data-export]').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), reports: listReports() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `convo-reports-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    saved('Exported');
  });

  // Destructive actions ask twice, in place.
  const confirmTwice = (btn, question, act) => {
    btn.addEventListener('click', () => {
      if (!('armed' in btn.dataset)) {
        btn.dataset.armed = '';
        btn.querySelector('span').textContent = question;
        setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.querySelector('span').textContent = btn.dataset.label; } }, 4000);
        return;
      }
      act();
    });
    btn.dataset.label = btn.querySelector('span').textContent;
  };
  confirmTwice(q('[data-delete-reports]'), 'Click again to delete', () => {
    // store.js keeps reports in memory, so clear the key and reload to start clean.
    try { localStorage.removeItem('convo-app-reports'); } catch { /* ignore */ }
    location.reload();
  });
  confirmTwice(q('[data-reset]'), 'Click again to reset', () => {
    clearAll();
    resetPrefs();
    resetSession();
    LAYERS.forEach((l) => setLayer(l, true));
    location.assign('./');
  });

  /* Section links scroll within the page and keep the route */
  const scrollTo = (id, smooth) => {
    const target = q(`#set-${id}`);
    if (!target) return;
    target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    root.querySelectorAll('[data-section-link]').forEach((a) => a.toggleAttribute('aria-current', a.dataset.sectionLink === id));
  };
  if (arg) requestAnimationFrame(() => scrollTo(arg, false));

  return () => { unbindLayers(); mascots.destroy(); clearTimeout(toastTimer); clearTimeout(nameTimer); };
}
