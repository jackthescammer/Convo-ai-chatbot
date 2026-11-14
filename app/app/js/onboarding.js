/* Onboarding screens.

   Adapted from Duolingo's onboarding for the web, with Convo's own questions. Convo asks one
   question per screen in its speech bubble and answers your last choice in the next one:

     welcome → hello → why → level (→ check) → display → difficulty → goals → ready

   Setup hands off to the app at /app/home.html (its dashboard; #/talk starts the café
   conversation), which reads what this writes: `convo-app-settings` (onboarded, level,
   difficulty, reasons, knows) and `convo-layers`.

   main.js owns routing, the shell, the mascot and the keyboard. Each screen here supplies:
     shell    'page' (brand header, centred) | 'flow' (back, progress, bubble, Continue bar)
     layout   flow only: 'side' (mascot left of the bubble) | 'stack' (bubble above the mascot)
     width    'narrow' | 'wide' (wide screens put a live preview beside the options)
     step     1..QUESTION_COUNT for the progress bar; 0 before the questions, 'done' after
     back     where Back goes when there is no in-app history to return to
     mood     the mascot's state on arrival (an event: you just answered something)
     bubble   { react, question } — react answers the previous choice
     body     HTML for the screen; bind() wires it; ready() gates Continue; next() saves and
              returns the next screen, or { href } to leave setup.
   Answers are saved the moment they're chosen, so a refresh keeps your place. */

import { saveSettings, DIFFICULTY_LABEL } from './store.js';
import { GOALS } from './model.js';
import { esc, layered, ICONS, bars, getLayers, setLayer, LAST_LAYER_HINT } from './ui.js';

export const QUESTION_COUNT = 5;

/** Where the app lives once setup is done. */
export const APP_HOME = '/app/home.html';
export const APP_TALK = '/app/home.html#/talk';

/** Pages outside setup that can open a single step (`#/check?from=settings`); Save and Back return there. */
export const RETURNS = { settings: '/app/home.html#/settings/setup' };

/* ---------- Content ---------- */
const WHY = [
  { id: 'travel', label: 'Preparing for a trip', icon: 'plane', react: 'A trip! Ordering at a counter is a good first conversation.' },
  { id: 'study', label: 'Studying Mandarin', icon: 'book', react: 'Nice. Speaking practice fits well alongside your classes.' },
  { id: 'living', label: 'Living where Mandarin is spoken', icon: 'home', react: "Then everyday conversations matter most. Let's start there." },
  { id: 'people', label: 'Talking with family or friends', icon: 'people', react: 'Lovely. Real conversations are the right practice for that.' },
  { id: 'work', label: 'For work', icon: 'briefcase', react: 'Useful. Small talk is a good place to start.' },
  { id: 'fun', label: 'Just for fun', icon: 'sparkle', react: 'Fun is the best reason there is.' },
  { id: 'other', label: 'Something else', icon: 'chat', react: 'Any reason works.' },
];
/* One reason gets its own reply; several get one that covers them all. */
const reasonReact = (ids = []) => (ids.length > 1
  ? 'All good reasons. Everyday conversations help with every one of them.'
  : WHY.find((w) => w.id === ids[0])?.react);

/* How much they know → Convo's level, and the difficulty setup suggests. */
const KNOWS = [
  { id: 'new', label: "I'm new to Mandarin", bars: 1, level: 'A1', difficulty: 'easy', react: "Okay, we'll start fresh at A1." },
  { id: 'words', label: 'I know some words and phrases', bars: 2, level: 'A1', difficulty: 'easy', react: "Good, we'll talk at A1." },
  { id: 'simple', label: 'I can have simple conversations', bars: 3, level: 'A2', difficulty: 'standard', react: "Great, we'll talk at A2." },
  { id: 'more', label: 'I can talk about most everyday things', sub: 'Convo goes up to A2 for now.', bars: 4, level: 'A2', difficulty: 'challenging', react: "We'll talk at A2, the highest level Convo has for now." },
];
const knowsById = (id) => KNOWS.find((k) => k.id === id) || null;

/* "Find my level": two things the barista might say, one A1 and one A2. */
const CHECK_LINES = [
  { zh: '你想喝什么？', py: 'Nǐ xiǎng hē shénme?', en: 'What would you like to drink?' },
  { zh: '不好意思，燕麦奶卖完了。牛奶可以吗？', py: 'Bù hǎoyìsi, yànmài nǎi mài wán le. Niúnǎi kěyǐ ma?', en: "Sorry, we're out of oat milk. Is regular milk OK?" },
];
const CHECK = [
  { id: 'neither', label: 'Neither yet', knows: 'new' },
  { id: 'first', label: 'Just the first one', knows: 'words' },
  { id: 'both', label: 'Both of them', knows: 'simple' },
];
let checkAnswer = null; // kept for this visit only; the result is saved as `knows`

/* Named as the conversation's own layer chips name them (汉字 / Pinyin / English). */
const LAYER_OPTIONS = [
  { id: 'hanzi', label: '汉字', sub: 'Chinese characters', sample: '你好', sampleCls: 'opt-sample', lang: 'zh-Hans' },
  { id: 'pinyin', label: 'Pinyin', sub: 'How it sounds', sample: 'nǐ hǎo', sampleCls: 'opt-sample opt-sample-py' },
  { id: 'english', label: 'English', sub: 'What it means', sample: 'hello', sampleCls: 'opt-sample' },
];
const LAYER_REACT = {
  '111': 'All three. Switch any of them off once you feel ready.',
  '110': 'No English. Good for getting used to it.',
  '101': 'Characters with English. Got it.',
  '100': 'Characters only. I like it.',
  '011': 'Pinyin is a fine start. Characters can come later.',
  '010': 'Pinyin only. Characters can come later.',
  '001': 'English only for now. Try adding pinyin when you can.',
};
const layerKey = (l) => `${+l.hanzi}${+l.pinyin}${+l.english}`;

const PREVIEW_LINES = {
  ai: { zh: '你好！你想喝什么？', py: 'Nǐ hǎo! Nǐ xiǎng hē shénme?', en: 'Hi! What would you like to drink?' },
  you: { zh: '我要一杯拿铁。', py: 'Wǒ yào yì bēi nátiě.', en: "I'd like a latte." },
};

const DIFFICULTY = [
  {
    id: 'easy', sub: 'Short questions, one thing at a time, everyday words.',
    line: { zh: '你想喝什么？', py: 'Nǐ xiǎng hē shénme?', en: 'What would you like to drink?' },
    react: "Easy it is. I'll keep my sentences short.",
  },
  {
    id: 'standard', sub: 'A natural pace, with follow-up questions to answer.',
    line: { zh: '你好，想喝点什么？要热的还是冰的？', py: 'Nǐ hǎo, xiǎng hē diǎn shénme? Yào rè de háishi bīng de?', en: 'Hi, what can I get you? Hot or iced?' },
    react: "Standard it is. I'll talk the way a friendly barista would.",
  },
  {
    id: 'challenging', sub: "Longer sentences, new words, and suggestions you didn't ask for.",
    line: {
      zh: '欢迎光临！今天想喝点什么？我们新出了桂花拿铁，要不要试试？',
      py: 'Huānyíng guānglín! Jīntiān xiǎng hē diǎn shénme? Wǒmen xīn chū le guìhuā nátiě, yào bu yào shìshi?',
      en: "Welcome! What would you like today? We've just brought out an osmanthus latte. Want to try it?",
    },
    react: 'Challenging. Expect a surprise or two.',
  },
];
const difficultyById = (id) => DIFFICULTY.find((d) => d.id === id) || DIFFICULTY[1];

/* What a learner might say for each scenario goal (the goals themselves live in model.js). */
const GOAL_EXAMPLES = {
  order: { zh: '我要一杯拿铁。', py: 'Wǒ yào yì bēi nátiě.', en: "I'd like a latte." },
  answer: { zh: '冰的，谢谢。', py: 'Bīng de, xièxie.', en: 'Iced, thanks.' },
  surprise: { zh: '没问题，我等一下。', py: 'Méi wèntí, wǒ děng yíxià.', en: "No problem, I'll wait." },
  pay: { zh: '可以用手机付吗？', py: 'Kěyǐ yòng shǒujī fù ma?', en: 'Can I pay by phone?' },
};

/* ---------- Pieces ---------- */
const zh = (text) => `<span lang="zh-Hans">${esc(text)}</span>`;

function option({ type = 'radio', name, value, checked, label, sub, icon, tag, tagCls = '', sample, key, toggle }) {
  return `
    <label class="opt">
      <input type="${type}" name="${name}" value="${esc(value)}" data-option${toggle ? ` data-layer-toggle="${esc(value)}"` : ''}${checked ? ' checked' : ''}>
      <span class="opt-row">
        ${icon ? `<span class="opt-icon">${icon}</span>` : ''}
        <span class="opt-text">
          <span class="opt-label">${esc(label)}</span>
          ${sub ? `<span class="opt-sub">${esc(sub)}</span>` : ''}
        </span>
        ${sample || ''}
        ${tag ? `<span class="opt-tag ${tagCls}">${esc(tag)}</span>` : ''}
        ${type === 'checkbox' ? `<span class="opt-box" aria-hidden="true">${ICONS.check}</span>` : ''}
        <kbd class="opt-key" aria-hidden="true">${key}</kbd>
      </span>
    </label>`;
}

const group = (legend, items) => `<fieldset class="opts"><legend class="sr-only">${esc(legend)}</legend>${items.join('')}</fieldset>`;

const aiMessage = (line, who = 'Convo <span class="msg-role">as the barista</span>') =>
  `<div class="msg msg-ai"><p class="msg-who">${who}</p><div class="bubble">${layered(line)}</div></div>`;
const youMessage = (line, who = 'You', cls = 'layered') =>
  `<div class="msg msg-you"><p class="msg-who">${esc(who)}</p><div class="bubble">${layered(line, { cls })}</div></div>`;

const preview = (label, inner, { live = false, note = '' } = {}) => `
  <figure class="preview">
    <figcaption class="preview-bar"><span>${esc(label)}</span><span class="badge">Sample</span></figcaption>
    <div class="preview-chat" data-preview${live ? ' aria-live="polite"' : ''}>${inner}</div>
    ${note ? `<p class="preview-note" data-preview-note>${esc(note)}</p>` : ''}
  </figure>`;

/** The settings so far, with a Change link per row. `from` is where Change returns to. */
export function summary(s, from) {
  const known = knowsById(s.knows);
  const l = getLayers();
  const shown = [['hanzi', zh('汉字')], ['pinyin', 'Pinyin'], ['english', 'English']]
    .filter(([k]) => l[k]).map(([, v]) => v).join(', ');
  const row = (label, value, screen) => `
    <div class="summary-row">
      <dt>${label}</dt>
      <dd>${value}</dd>
      <dd class="summary-edit"><a class="text-link" href="#/${screen}?from=${from}">Change<span class="sr-only"> ${label.toLowerCase()}</span></a></dd>
    </div>`;
  return `<dl class="summary">
    ${row('Level', `${esc(s.level)}${known ? `<span class="summary-sub">${esc(known.label)}</span>` : ''}`, 'level')}
    ${row('Difficulty', esc(DIFFICULTY_LABEL[s.difficulty]), 'difficulty')}
    ${row('Show', shown, 'display')}
  </dl>`;
}

/** Saves the choice from a radio group and nudges the mascot. */
function onPick(root, ctx, save) {
  root.addEventListener('change', (e) => {
    if (e.target.type !== 'radio') return;
    save(e.target.value);
    ctx.react('nod');
    ctx.refresh();
  });
}

/* ---------- Screens ---------- */
export const SCREENS = {
  welcome: {
    shell: 'page',
    title: 'Welcome',
    page: (s) => `
      <div class="pg-center">
        <span class="pg-mascot" data-mascot="wave"></span>
        <h1 class="pg-display" tabindex="-1">Learn Mandarin by talking.</h1>
        <div class="pg-actions">
          <a class="btn btn-primary" href="#/hello">Get started</a>
          ${s.onboarded
            ? `<a class="text-link" href="${APP_HOME}">Back to the app</a>`
            : '<a class="text-link" href="#/ready">Skip setup</a>'}
        </div>
        <p class="pg-fine">For <span class="nowrap">A1–A2</span> learners. No account needed, and your answers stay in this browser.</p>
      </div>`,
    mood: 'wave',
    settle: 'happy',
  },

  hello: {
    shell: 'flow', layout: 'stack', width: 'narrow', step: 0,
    title: 'Hello',
    back: 'welcome',
    mood: 'wave',
    settle: 'happy',
    bubble: () => ({ question: "Hi there! I'm Convo." }),
    next: () => 'why',
  },

  why: {
    shell: 'flow', layout: 'side', width: 'narrow', step: 1,
    title: 'Why are you learning?',
    back: 'hello',
    mood: 'curious',
    bubble: () => ({ question: 'Why are you learning Mandarin?' }),
    body: (s) => group('Why are you learning Mandarin?', WHY.map((w, i) => option({
      type: 'checkbox', name: 'reasons', value: w.id, checked: s.reasons.includes(w.id), label: w.label, icon: ICONS[w.icon], key: i + 1,
    }))),
    bind: (root, ctx) => {
      root.addEventListener('change', (e) => {
        if (e.target.name !== 'reasons') return;
        const reasons = [...root.querySelectorAll('input[name="reasons"]:checked')].map((input) => input.value);
        saveSettings({ reasons });
        if (e.target.checked) ctx.react('nod');
        ctx.refresh();
      });
    },
    ready: (s) => s.reasons.length > 0,
    next: () => 'level',
  },

  level: {
    shell: 'flow', layout: 'side', width: 'narrow', step: 2,
    title: 'Your level',
    back: 'why',
    mood: (s, ctx) => (!ctx.from && s.reasons.length ? 'happy' : 'curious'),
    bubble: (s) => ({
      react: reasonReact(s.reasons),
      question: 'How much Mandarin do you know?',
    }),
    body: (s, ctx) => `
      ${group('How much Mandarin do you know?', KNOWS.map((k, i) => option({
        name: 'knows', value: k.id, checked: s.knows === k.id, label: k.label, sub: k.sub,
        icon: bars(k.bars), tag: k.level, key: i + 1,
      })))}
      <p class="ob-aside">Not sure? <a class="text-link" href="#/check${ctx.from ? `?from=${ctx.from}` : ''}">Check with two sentences</a></p>`,
    bind: (root, ctx) => onPick(root, ctx, (id) => saveSettings({ knows: id, level: knowsById(id).level })),
    ready: (s) => Boolean(s.knows),
    next: () => 'display',
  },

  check: {
    shell: 'flow', layout: 'side', width: 'wide', step: 2,
    title: 'Check your level',
    back: 'level',
    mood: 'reading',
    bubble: () => ({ question: 'Which of these could you answer?' }),
    body: () => `
      <div class="ob-split ob-split-lead check"${checkAnswer ? ' data-answered' : ''} data-check>
        <div>
          ${preview('What Convo might say', CHECK_LINES.map((line, i) => aiMessage(line, `<span class="num" aria-hidden="true">${i + 1}</span><span class="sr-only">Line ${i + 1}: </span>Convo`)).join(''))}
          <p class="check-reveal" data-reveal>${checkAnswer ? 'English added under each line.' : ''}</p>
        </div>
        ${group('Which of these could you answer?', CHECK.map((c, i) => option({
          name: 'check', value: c.id, checked: checkAnswer === c.id, label: c.label,
          tag: knowsById(c.knows).level, key: i + 1,
        })))}
      </div>`,
    bind: (root, ctx) => {
      const box = root.querySelector('[data-check]');
      onPick(root, ctx, (id) => {
        checkAnswer = id;
        if (!box.hasAttribute('data-answered')) {
          box.setAttribute('data-answered', '');
          root.querySelector('[data-reveal]').textContent = 'English added under each line.';
        }
      });
    },
    ready: () => Boolean(checkAnswer),
    next: () => {
      const knows = CHECK.find((c) => c.id === checkAnswer).knows;
      saveSettings({ knows, level: knowsById(knows).level });
      return 'display';
    },
  },

  display: {
    shell: 'flow', layout: 'side', width: 'wide', step: 3,
    title: 'What to show',
    back: 'level',
    mood: 'talking',
    bubble: (s) => ({
      react: knowsById(s.knows)?.react,
      question: 'How should I write what I say?',
    }),
    body: () => {
      const l = getLayers();
      return `
        <div class="ob-split">
          ${group('Show in the conversation', LAYER_OPTIONS.map((o, i) => option({
            type: 'checkbox', name: 'layers', value: o.id, checked: l[o.id], label: o.label, sub: o.sub, key: i + 1, toggle: true,
            sample: `<span class="${o.sampleCls}"${o.lang ? ` lang="${o.lang}"` : ''}>${esc(o.sample)}</span>`,
          })))}
          ${preview('How the conversation will look', aiMessage(PREVIEW_LINES.ai) + youMessage(PREVIEW_LINES.you))}
        </div>`;
    },
    bind: (root, ctx) => {
      root.addEventListener('change', (e) => {
        const input = e.target.closest('input[data-layer-toggle]');
        if (!input) return;
        if (setLayer(input.value, input.checked)) {
          ctx.note('');
          ctx.react('nod');
        } else {
          input.checked = true;
          ctx.note(LAST_LAYER_HINT, 'warn');
          ctx.react('shake');
        }
      });
    },
    next: () => 'difficulty',
  },

  difficulty: {
    shell: 'flow', layout: 'side', width: 'wide', step: 4,
    title: 'Difficulty',
    back: 'display',
    mood: 'chatting',
    /* Until the learner picks, suggest the difficulty that fits their level. */
    enter: (s) => {
      const suggested = knowsById(s.knows)?.difficulty;
      if (!s.difficultyPicked && suggested && s.difficulty !== suggested) saveSettings({ difficulty: suggested });
    },
    bubble: () => ({ react: LAYER_REACT[layerKey(getLayers())], question: 'How much should I challenge you?' }),
    body: (s) => {
      const suggested = knowsById(s.knows)?.difficulty;
      const current = difficultyById(s.difficulty);
      return `
        <div class="ob-split">
          ${group('How much should Convo challenge you?', DIFFICULTY.map((d, i) => option({
            name: 'difficulty', value: d.id, checked: s.difficulty === d.id, label: DIFFICULTY_LABEL[d.id], sub: d.sub,
            tag: d.id === suggested ? 'Suggested' : '', tagCls: 'opt-tag-soft', key: i + 1,
          })))}
          ${preview('How I would open', aiMessage(current.line), { live: true })}
        </div>`;
    },
    bind: (root, ctx) => {
      const chat = root.querySelector('[data-preview]');
      onPick(root, ctx, (id) => {
        saveSettings({ difficulty: id, difficultyPicked: true });
        chat.innerHTML = aiMessage(difficultyById(id).line);
        ctx.enter(chat.firstElementChild);
        if (id === 'challenging') ctx.react('bounce');
      });
    },
    next: () => 'goals',
  },

  goals: {
    shell: 'flow', layout: 'side', width: 'wide', step: 5,
    title: "What you'll practise",
    back: 'difficulty',
    mood: 'report',
    bubble: (s) => ({ react: difficultyById(s.difficulty).react, question: "Here's what you'll practise." }),
    /* The principle first (it's the one thing to take away), then each goal as something you'd say. */
    body: () => `
      <div class="ob-split ob-split-goals">
        <section class="principle" aria-labelledby="principle-title">
          <h2 class="principle-title" id="principle-title">Convo won't stop to correct you.</h2>
          <p>It keeps notes while you talk. Your report goes through them afterwards: what you said, a better version, pinyin, English and why.</p>
          <ul class="principle-tags" aria-label="Notes your report can include">
            <li class="tag tag-grammar">Grammar</li>
            <li class="tag tag-natural">More natural</li>
            <li class="tag tag-surprise">Handled a surprise</li>
            <li class="tag tag-ok">Left alone</li>
          </ul>
        </section>
        ${preview('Things you might say', GOALS.map((g) => (GOAL_EXAMPLES[g.id] ? youMessage(GOAL_EXAMPLES[g.id], g.label, 'layered layered-sm') : '')).join(''))}
      </div>`,
    next: () => 'ready',
  },

  ready: {
    shell: 'flow', layout: 'stack', width: 'narrow', step: 'done',
    title: 'Ready',
    back: 'goals',
    mood: 'celebrate',
    bubble: () => ({ question: "All set. Let's order something!" }),
    body: (s) => summary(s, 'ready'),
    cta: 'Start the conversation',
    next: () => {
      saveSettings({ onboarded: true });
      return { href: APP_TALK };
    },
  },
};

/** Screen order, used to decide which way a transition slides. */
export const ORDER = ['welcome', 'hello', 'why', 'level', 'check', 'display', 'difficulty', 'goals', 'ready'];
