/* Conversation model.

   The UI talks to the model only through `model.start`, `model.reply` and `model.report`,
   and everything the model sends back goes through `validateTurn` / `validateReport`
   before it is shown.

   Two models can sit behind that contract:
   - The live Convo model (the default): Qwen2.5-3B-Instruct running the team's Gradio app
     (github.com/jackthescammer/Convo-ai-chatbot, `app.py` + `convo/`) on a Google Colab GPU.
     `gradioModel` below calls its `/start`, `/send` and `/finish` endpoints.
   - The placeholder: fixed barista lines that ignore what the learner wrote. Used only when
     asked for (?model=placeholder), never as a silent fallback when the live model is down.

   Shapes
   ------
   Line   { zh: string, py?: string, en?: string }           汉字, pinyin, English
   Note   { tag: 'grammar'|'natural'|'vocab'|'surprise'|'ok', label: string,
            from?: string, to?: string,                      short fragment, for the rail
            said?: string, better?: Line, mark?: string,     whole sentence, for the report
            title?: string, why?: string, text?: string }
   Turn   { reply: Line, mood?: 'talking'|'surprised'|'happy', notes?: Note[],
            goals?: { [goalId]: boolean }, suggestions?: Line[], ended?: boolean }
   Report { summary: string, assessment: {label, value}[], fixes: Note[], leftAlone: Line[],
            pattern: string, next: string, caveat?: string }

   Calls
   -----
   start({ settings })                  -> Promise<Turn>     the barista's opening line
   reply({ history, settings })         -> Promise<Turn>     history: [{ who: 'ai'|'you', zh }]
   report({ history, notes, settings }) -> Promise<Report>
*/

/* ---------- Which model ----------
   Colab gives the live app a new public link every time it is relaunched. Put the newest
   "Running on public URL" in DEFAULT_MODEL_URL, or change it without editing code: open the
   app once with ?model=<link> (or ?model=placeholder), or paste it in Settings › About.
   Both are remembered in this browser under 'convo-model-url'. */
export const DEFAULT_MODEL_URL = 'https://9ab894f01db31f47b3.gradio.live';
const MODEL_URL_KEY = 'convo-model-url';
const PLACEHOLDER = 'placeholder';

function cleanModelUrl(value) {
  const v = String(value ?? '').trim();
  if (!v) return '';
  if (v.toLowerCase() === PLACEHOLDER) return PLACEHOLDER;
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    return `${u.origin}${u.pathname.replace(/\/+$/, '')}`;
  } catch {
    return '';
  }
}

/** Remember a model link in this browser ('' goes back to DEFAULT_MODEL_URL).
    Returns the link now in use, or null if `value` isn't a usable link. */
export function setModelUrl(value) {
  const clean = cleanModelUrl(value);
  if (String(value ?? '').trim() && !clean) return null;
  try {
    if (clean) localStorage.setItem(MODEL_URL_KEY, clean);
    else localStorage.removeItem(MODEL_URL_KEY);
  } catch { /* private window: the link still applies to this page */ }
  return clean || DEFAULT_MODEL_URL;
}

function chosenModelUrl() {
  let fromQuery = null;
  try { fromQuery = new URLSearchParams(location.search).get('model'); } catch { /* no location */ }
  if (fromQuery !== null && cleanModelUrl(fromQuery)) return setModelUrl(fromQuery);
  let saved = null;
  try { saved = localStorage.getItem(MODEL_URL_KEY); } catch { /* storage blocked */ }
  return cleanModelUrl(saved) || DEFAULT_MODEL_URL;
}

const MODEL_URL = chosenModelUrl();
const LIVE = MODEL_URL !== PLACEHOLDER;

/* `connected` means "a real model, not the placeholder": it removes the Placeholder labels.
   Whether the live model is reachable is only known when a call is made.
   `provides` lists what the model's turns include; the UI hides what it doesn't send. */
export const MODEL_INFO = LIVE
  ? {
    connected: true,
    name: 'Live Convo model', // replaced by the model the server reports, once it answers
    detail: 'The live Convo model, running on a Google Colab GPU.',
    url: MODEL_URL,
    isDefaultUrl: MODEL_URL === DEFAULT_MODEL_URL,
    provides: { goals: false, notes: false, suggestions: false },
  }
  : {
    connected: false,
    name: 'Placeholder',
    detail: 'Placeholder replies, not the conversation model.',
    url: null,
    isDefaultUrl: false,
    provides: { goals: true, notes: true, suggestions: true },
  };

/* The scenario's goals (shown in the rail). The model marks them done through `turn.goals`. */
export const GOALS = [
  { id: 'order', label: 'Order a drink' },
  { id: 'answer', label: "Answer the barista's questions" },
  { id: 'surprise', label: 'Cope with a surprise' },
  { id: 'pay', label: 'Pay for your order' },
];

/* ---------- Validation: nothing from the model is shown until it passes ---------- */
const CJK = /[㐀-鿿]/;
const MOODS = ['talking', 'surprised', 'happy'];
const TAGS = ['grammar', 'natural', 'vocab', 'surprise', 'ok'];
const str = (v, max = 400) => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null);

function cleanLine(line, { requireChinese = true } = {}) {
  if (!line || typeof line !== 'object') return null;
  const zh = str(line.zh, 200);
  if (!zh || (requireChinese && !CJK.test(zh))) return null;
  return { zh, py: str(line.py, 300) || undefined, en: str(line.en, 300) || undefined };
}

function cleanNote(n) {
  if (!n || !TAGS.includes(n.tag) || !str(n.label, 40)) return null;
  const out = { tag: n.tag, label: n.label.trim() };
  ['from', 'to', 'said', 'mark', 'title', 'why', 'text'].forEach((k) => { const v = str(n[k]); if (v) out[k] = v; });
  if (n.better) { const b = cleanLine(n.better); if (b) out.better = b; }
  return out;
}

export function validateTurn(turn) {
  const reply = cleanLine(turn?.reply);
  if (!reply) throw new Error('The reply was empty or not in Chinese.');
  const goals = {};
  if (turn.goals && typeof turn.goals === 'object') {
    GOALS.forEach(({ id }) => { if (typeof turn.goals[id] === 'boolean') goals[id] = turn.goals[id]; });
  }
  return {
    reply,
    mood: MOODS.includes(turn.mood) ? turn.mood : 'talking',
    notes: (Array.isArray(turn.notes) ? turn.notes : []).map(cleanNote).filter(Boolean).slice(0, 4),
    goals,
    suggestions: (Array.isArray(turn.suggestions) ? turn.suggestions : []).map((l) => cleanLine(l)).filter(Boolean).slice(0, 4),
    ended: turn.ended === true,
  };
}

export function validateReport(r) {
  if (!r || typeof r !== 'object' || !str(r.summary, 800)) throw new Error('The report came back without a summary.');
  return {
    summary: r.summary.trim(),
    assessment: (Array.isArray(r.assessment) ? r.assessment : [])
      .filter((a) => str(a?.label, 60) && str(String(a?.value ?? ''), 80))
      .map((a) => ({ label: a.label.trim(), value: String(a.value).trim() })).slice(0, 4),
    fixes: (Array.isArray(r.fixes) ? r.fixes : []).map(cleanNote).filter((n) => n && n.said).slice(0, 8),
    leftAlone: (Array.isArray(r.leftAlone) ? r.leftAlone : []).map((l) => cleanLine(l)).filter(Boolean).slice(0, 3),
    pattern: str(r.pattern, 300) || '',
    next: str(r.next, 300) || '',
    caveat: str(r.caveat, 400) || '',
  };
}

/* ---------- Placeholder content ---------- */
const OPENINGS = {
  easy: { zh: '你好！你想喝什么？', py: 'Nǐ hǎo! Nǐ xiǎng hē shénme?', en: 'Hi! What would you like to drink?' },
  standard: { zh: '你好，想喝点什么？', py: 'Nǐ hǎo, xiǎng hē diǎn shénme?', en: 'Hi, what can I get you?' },
  challenging: {
    zh: '欢迎光临！今天想喝点什么？我们新出了桂花拿铁，要不要试试？',
    py: 'Huānyíng guānglín! Jīntiān xiǎng hē diǎn shénme? Wǒmen xīn chū le guìhuā nátiě, yào bu yào shìshi?',
    en: "Welcome! What would you like today? We've just brought out an osmanthus latte. Want to try it?",
  },
};

const OPENING_SUGGESTIONS = [
  { zh: '我要一杯拿铁。', py: 'Wǒ yào yì bēi nátiě.', en: "I'd like a latte." },
  { zh: '我要一杯美式，谢谢。', py: 'Wǒ yào yì bēi Měishì, xièxie.', en: 'An Americano, please.' },
];

/* One step per learner message, in order. */
const STEPS = [
  {
    reply: { zh: '好的！要热的还是冰的？', py: 'Hǎo de! Yào rè de háishi bīng de?', en: 'Sure! Hot or iced?' },
    goals: { order: true },
    suggestions: [
      { zh: '冰的。', py: 'Bīng de.', en: 'Iced.' },
      { zh: '热的，谢谢。', py: 'Rè de, xièxie.', en: 'Hot, thanks.' },
    ],
  },
  {
    reply: { zh: '不好意思，今天人很多，要等十分钟。可以吗？', py: 'Bù hǎoyìsi, jīntiān rén hěn duō, yào děng shí fēnzhōng. Kěyǐ ma?', en: "Sorry, it's busy today, so there's a ten-minute wait. Is that OK?" },
    mood: 'surprised',
    surprise: true,
    suggestions: [
      { zh: '可以，没问题。', py: 'Kěyǐ, méi wèntí.', en: 'Sure, no problem.' },
      { zh: '好的，我等一下。', py: 'Hǎo de, wǒ děng yíxià.', en: "OK, I'll wait." },
    ],
  },
  {
    reply: { zh: '谢谢！在这儿喝还是带走？', py: 'Xièxie! Zài zhèr hē háishi dàizǒu?', en: 'Thanks! For here or to go?' },
    goals: { surprise: true },
    afterSurprise: true,
    suggestions: [
      { zh: '在这儿喝。', py: 'Zài zhèr hē.', en: 'For here.' },
      { zh: '带走，谢谢。', py: 'Dàizǒu, xièxie.', en: 'To go, thanks.' },
    ],
  },
  {
    reply: { zh: '好的。一共二十八块。你用手机付吗？', py: 'Hǎo de. Yígòng èrshíbā kuài. Nǐ yòng shǒujī fù ma?', en: "OK. That's 28 kuai altogether. Are you paying by phone?" },
    goals: { answer: true },
    suggestions: [
      { zh: '对，用手机。', py: 'Duì, yòng shǒujī.', en: 'Yes, by phone.' },
      { zh: '我用现金。', py: 'Wǒ yòng xiànjīn.', en: "I'll pay cash." },
      { zh: '多少钱？', py: 'Duōshao qián?', en: 'How much is it?' },
    ],
  },
  {
    reply: { zh: '付好了！你是第一次来吗？', py: 'Fù hǎo le! Nǐ shì dì-yī cì lái ma?', en: 'All paid! Is this your first time here?' },
    goals: { pay: true },
    suggestions: [
      { zh: '对，第一次来。', py: 'Duì, dì-yī cì lái.', en: 'Yes, first time.' },
      { zh: '不是，我常来。', py: 'Bú shì, wǒ cháng lái.', en: 'No, I come here often.' },
    ],
  },
  {
    reply: { zh: '欢迎！你的饮料马上好。下次见！', py: 'Huānyíng! Nǐ de yǐnliào mǎshàng hǎo. Xià cì jiàn!', en: 'Welcome! Your drink will be ready in a moment. See you next time!' },
    mood: 'happy',
    ended: true,
  },
];

/* Three hand-written checks so the notes rail and report can be clicked through.
   The real model replaces all of this. */
const PLACEHOLDER_CHECKS = [
  {
    test: /(多少钱|多少|几|哪儿|哪里|谁|怎么)([^吗。！？?!]*)吗/,
    note: (m, said) => ({
      tag: 'grammar', label: 'Grammar', title: 'Questions that already have a question word',
      from: `${m[1]}${m[2]}吗`, to: `${m[1]}${m[2]}`, said, mark: '吗',
      better: { zh: said.replace(m[0], `${m[1]}${m[2]}`) },
      why: `${m[1]} already makes it a question, so adding 吗 asks it twice.`,
    }),
  },
  {
    test: /(?<!不|就|还|也|都)是(很|太|非常)/,
    note: (m, said) => ({
      tag: 'grammar', label: 'Grammar', title: '是 before adjectives',
      from: `是${m[1]}`, to: m[1], said, mark: '是',
      better: { zh: said.replace(m[0], m[1]) },
      why: `Adjectives act as the verb in Chinese. Link them with ${m[1]}, not 是.`,
    }),
  },
  {
    test: /([一两几])个(拿铁|美式|咖啡|奶茶|绿茶|茶)/,
    note: (m, said) => ({
      tag: 'natural', label: 'More natural', title: 'Measure words for drinks',
      from: `${m[1]}个${m[2]}`, to: `${m[1]}杯${m[2]}`, said, mark: '个',
      better: { zh: said.replace(m[0], `${m[1] === '一' ? '一' : m[1]}杯${m[2]}`) },
      why: '个 is understood, but drinks usually take 杯 (cup).',
    }),
  },
];

const delay = (ms) => new Promise((r) => { setTimeout(r, ms); });
const learnerCount = (history) => history.filter((h) => h.who === 'you').length;

const placeholderModel = {
  async start({ settings }) {
    await delay(700);
    return { reply: OPENINGS[settings.difficulty] || OPENINGS.standard, mood: 'talking', suggestions: OPENING_SUGGESTIONS };
  },

  async reply({ history }) {
    const n = learnerCount(history);
    const step = STEPS[Math.min(n, STEPS.length) - 1];
    const said = history[history.length - 1]?.zh || '';
    const notes = [];
    PLACEHOLDER_CHECKS.forEach((c) => { const m = said.match(c.test); if (m) notes.push(c.note(m, said)); });
    if (step.afterSurprise && CJK.test(said)) {
      notes.push({ tag: 'surprise', label: 'Handled a surprise', text: 'There was a ten-minute wait. You kept going in Mandarin.' });
    }
    await delay(800 + Math.min(700, step.reply.zh.length * 30));
    return { ...step, notes };
  },

  async report({ history, notes, settings }) {
    await delay(900);
    const mine = history.filter((h) => h.who === 'you');
    const inMandarin = mine.filter((h) => CJK.test(h.zh)).length;
    const finished = learnerCount(history) >= STEPS.length;
    const fixes = notes.filter((n) => n.said);
    const surprised = notes.some((n) => n.tag === 'surprise');
    const look = fixes.length === 1 ? 'One sentence is worth another look.' : `${fixes.length} sentences are worth another look.`;
    return {
      summary: `You sent ${mine.length} message${mine.length === 1 ? '' : 's'}, ${inMandarin === mine.length ? 'all in Mandarin' : `${inMandarin} in Mandarin`}, and ${finished ? 'made it to the end of the conversation' : 'stopped partway through'}. ${fixes.length ? look : 'Nothing was flagged this time.'}`,
      assessment: [
        { label: 'In Mandarin', value: `${inMandarin} of ${mine.length} messages` },
        { label: 'Surprise', value: surprised ? 'Handled in Mandarin' : 'Not reached' },
        { label: 'Level', value: `${settings.level}, ${settings.difficulty[0].toUpperCase()}${settings.difficulty.slice(1)}` },
      ],
      fixes,
      leftAlone: [],
      pattern: fixes.length > 1 ? 'Several small grammar slips. Read each "Why" before the next conversation.' : 'Nothing came up more than once.',
      next: settings.difficulty === 'challenging'
        ? 'Stay on Challenging and ask the barista a question of your own, like 你推荐什么？'
        : 'Try the next difficulty up. The barista asks more follow-up questions.',
    };
  },
};

/* ---------- Live model: the team's Gradio app ----------
   The Gradio app keeps each conversation on the server, under the session_hash sent with
   every call: `/start` opens it, `/send` adds one learner message and returns the reply,
   `/finish` writes the report. Replies come back as display text ("汉字\n\n*pinyin*\n\n> English",
   from convo/render.py) and the report as Markdown (Report.to_markdown in convo/review.py);
   both are produced by code, not by the model, so they can be parsed back reliably. */

const DIFFICULTY_NAME = { easy: 'Easy', standard: 'Standard', challenging: 'Challenging' };
const OFFLINE = "Can't reach the live model. It runs on a Google Colab GPU that's started by hand, so it may be off, or its link may have changed (Settings › About).";
const LOST = "The live model no longer has this conversation (it may have been restarted). Start a new conversation.";

/* pypinyin gives "nín hǎo， huān yíng。": switch to Latin punctuation and capitalise sentences. */
const PINYIN_PUNCT = { '，': ',', '。': '.', '？': '?', '！': '!', '、': ',', '；': ';', '：': ':', '（': '(', '）': ')', '“': '"', '”': '"' };
function tidyPinyin(text) {
  return text
    .replace(/[，。？！、；：（）“”]/g, (c) => PINYIN_PUNCT[c])
    .replace(/\s+([,.?!;:)])/g, '$1')
    .replace(/([,.?!;:])(?=[^\s,.?!;:)"])/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|[.?!]\s)(\S)/g, (m, before, first) => before + first.toUpperCase());
}

const textOf = (content) => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((b) => (typeof b === 'string' ? b : b?.text || '')).join('');
  return '';
};

/* One barista message from the display text. */
function lineFrom(text) {
  const zh = [];
  const en = [];
  let py = '';
  text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).forEach((part) => {
    if (part.startsWith('>')) en.push(part.replace(/^>\s?/gm, '').trim());
    else if (/^\*[^*][\s\S]*\*$/.test(part) && !CJK.test(part)) py = tidyPinyin(part.slice(1, -1));
    else zh.push(part);
  });
  return { zh: zh.join(' '), py, en: en.join(' ') };
}

function turnFrom(outputs) {
  const chat = Array.isArray(outputs) ? outputs.find((v) => Array.isArray(v)) : null;
  const msg = chat && [...chat].reverse().find((m) => m?.role === 'assistant');
  if (!msg) throw new Error(LOST);
  return { reply: lineFrom(textOf(msg.content)), mood: 'talking' };
}

/* ---- Report Markdown -> Report ---- */
const FIX_SECTIONS = {
  'Grammar corrections': { tag: 'grammar', label: 'Grammar', title: 'Grammar' },
  'Vocabulary improvements': { tag: 'vocab', label: 'Vocabulary', title: 'Word choice' },
  'More natural expressions': { tag: 'natural', label: 'More natural', title: 'A more natural way to say it' },
};
const unbold = (s) => s.replace(/\*\*(.+?)\*\*/g, '$1').trim();
const listItems = (text) => (text || '').split('\n').filter((l) => /^-\s/.test(l)).map((l) => unbold(l.replace(/^-\s+/, '')));

/* What the correction changed: the differing middle of the two sentences (e.g. 杯 -> 个).
   Used for the fix's title and to highlight the learner's words; long rewrites get neither. */
function changedParts(said, better) {
  const a = said.replace(/[。！？.!?\s]+$/, '');
  const b = better.replace(/[。！？.!?\s]+$/, '');
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let end = 0;
  while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end += 1;
  const from = a.slice(start, a.length - end);
  const to = b.slice(start, b.length - end);
  return from.length <= 8 && to.length <= 8 && (from || to) ? { from, to } : null;
}

function fixTitle(change, fallback) {
  if (!change) return fallback;
  if (change.from && change.to) return `${change.from} → ${change.to}`;
  return change.from ? `Leave out ${change.from}` : `Add ${change.to}`;
}

function parseFixes(text, kind) {
  const entries = [];
  let cur = null;
  let field = null;
  const FIELDS = { 'You wrote': 'said', Better: 'better', Meaning: 'en', Why: 'why' };
  (text || '').split('\n').forEach((line) => {
    const m = line.match(/^\s*-\s+\*\*(You wrote|Better|Meaning|Why):\*\*\s?(.*)$/);
    if (m) {
      if (m[1] === 'You wrote') { cur = {}; entries.push(cur); }
      if (!cur) return;
      field = FIELDS[m[1]];
      cur[field] = m[2].trim();
    } else if (cur && field && line.trim()) {
      cur[field] = `${cur[field]} ${line.trim()}`; // a wrapped explanation
    }
  });
  return entries.filter((e) => e.said).map((e) => {
    let zh = e.better || '';
    let py;
    const withPinyin = zh.match(/^(.*\S)\s+\(([^()]+)\)$/);
    if (withPinyin && !CJK.test(withPinyin[2])) { zh = withPinyin[1]; py = tidyPinyin(withPinyin[2]); }
    const change = zh ? changedParts(e.said, zh) : null;
    return {
      tag: kind.tag,
      label: kind.label,
      title: fixTitle(change, kind.title),
      said: e.said,
      better: zh ? { zh, py, en: e.en } : undefined,
      why: e.why,
      mark: change?.from && change.from.length <= 6 ? change.from : undefined,
    };
  });
}

function parseReport(md) {
  const cut = md.lastIndexOf('\n---\n');
  const body = cut >= 0 ? md.slice(0, cut) : md;
  const foot = cut >= 0 ? md.slice(cut + 5) : '';
  const sections = {};
  const [head, ...chunks] = body.split(/^## /m);
  chunks.forEach((chunk) => {
    const nl = chunk.indexOf('\n');
    sections[(nl < 0 ? chunk : chunk.slice(0, nl)).trim()] = nl < 0 ? '' : chunk.slice(nl + 1).trim();
  });

  // "Level **A2** · Difficulty **Standard** · 3 sentence(s) checked, 1 with a correction"
  const counts = head.match(/(\d+) sentence\(s\) checked, (\d+) with a correction/);
  const headText = head.split('\n').map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('Level **')).map(unbold).join(' ');

  const recurring = listItems(sections['Recurring weaknesses']).map((l) => l.replace(/:\s*(\d+) times$/, ' ($1 times)'));
  let next = '';
  listItems(sections['Suggested next steps']).forEach((tip) => {
    if (!next) next = tip;
    else if (next.length + tip.length + 1 <= 300) next = `${next} ${tip}`;
  });

  return {
    summary: unbold(sections.Overall || '') || headText || 'The report came back empty.',
    assessment: counts
      ? [{ label: 'Sentences checked', value: counts[1] }, { label: 'With a correction', value: counts[2] }]
      : [],
    fixes: Object.entries(FIX_SECTIONS).flatMap(([heading, kind]) => parseFixes(sections[heading], kind)),
    leftAlone: listItems(sections['Already correct']).map((zh) => ({ zh })),
    pattern: recurring.length ? `Came up more than once: ${recurring.join(', ')}.` : '',
    next,
    caveat: unbold(foot.replace(/\s+/g, ' ')),
  };
}

/* ---- Calls ---- */
async function readResult(res) {
  // Server-sent events: wait for `complete` (the outputs) or `error`.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buf = (buf + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n');
    let gap = buf.indexOf('\n\n');
    while (gap >= 0) {
      const block = buf.slice(0, gap);
      buf = buf.slice(gap + 2);
      const event = block.match(/^event:\s*(.*)$/m)?.[1].trim();
      const data = block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('\n');
      if (event === 'complete' || event === 'error') {
        reader.cancel().catch(() => {});
        let parsed = null;
        try { parsed = JSON.parse(data); } catch { parsed = data || null; }
        if (event === 'complete') return parsed;
        throw new Error(typeof parsed === 'string' && parsed
          ? `The live model hit an error: ${parsed}`
          : 'The live model hit an error while answering. Try again.');
      }
      gap = buf.indexOf('\n\n');
    }
    if (done) throw new Error('The live model closed the connection before answering. Try again.');
  }
}

/** Is the live model's server up? Resolves { ok, name }. Also fills in MODEL_INFO.name from the
    app's footer, which says which model and prompt version it runs ("Model: Qwen/... · prompts v6"). */
export async function checkModel() {
  if (!LIVE) return { ok: false, name: MODEL_INFO.name };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`${MODEL_URL}/config`, { signal: ctrl.signal });
    if (!res.ok) return { ok: false, name: MODEL_INFO.name };
    const cfg = await res.json();
    for (const c of cfg.components || []) {
      const m = typeof c?.props?.value === 'string' && c.props.value.match(/Model:\s*([^·<\n]+?)\s*·\s*prompts\s*([\w.-]+)/);
      if (m) { MODEL_INFO.name = `${m[1].split('/').pop()}, prompts ${m[2]}`; break; }
    }
    return { ok: true, name: MODEL_INFO.name };
  } catch {
    return { ok: false, name: MODEL_INFO.name };
  } finally {
    clearTimeout(timer);
  }
}

function gradioModel(base) {
  let session = null; // one Gradio session per conversation

  async function call(api, data, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${base}/gradio_api/call/${api}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, session_hash: session }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(res.status === 404 ? OFFLINE : `The live model answered with an error (HTTP ${res.status}).`);
      const { event_id: eventId } = await res.json();
      const stream = await fetch(`${base}/gradio_api/call/${api}/${eventId}`, { signal: ctrl.signal });
      if (!stream.ok || !stream.body) throw new Error(`The live model answered with an error (HTTP ${stream.status}).`);
      return await readResult(stream);
    } catch (err) {
      if (err?.name === 'AbortError') throw new Error(`The live model took more than ${Math.round(timeoutMs / 1000)} seconds to answer. Try again.`);
      if (err instanceof TypeError) throw new Error(OFFLINE); // network failure, or the link is gone
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async start({ settings }) {
      session = `convo${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      checkModel();
      const level = settings.level === 'A1' ? 'A1' : 'A2';
      const out = await call('start', [level, DIFFICULTY_NAME[settings.difficulty] || 'Standard', ['chinese', 'pinyin', 'english']], 90000);
      return turnFrom(out);
    },

    async reply({ history }) {
      if (!session) throw new Error(LOST);
      const said = [...history].reverse().find((h) => h.who === 'you')?.zh;
      if (!said) throw new Error('There was no message to send.');
      // Only the new message goes up: the server already has the rest of the conversation.
      // (Trying again after a failed call sends it again.)
      return turnFrom(await call('send', [said, []], 90000));
    },

    async report() {
      if (!session) throw new Error(LOST);
      // The server checks every sentence one by one, so this takes a while.
      const out = await call('finish', [], 300000);
      const md = Array.isArray(out) ? out.find((v) => typeof v === 'string' && v.includes('# Your conversation report')) : null;
      if (!md) throw new Error(LOST);
      return parseReport(md);
    },
  };
}

export const model = LIVE ? gradioModel(MODEL_URL) : placeholderModel;
