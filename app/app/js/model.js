/* Conversation model: PLACEHOLDER.

   The real chatbot (Qwen2.5-3B-Instruct) runs elsewhere. The UI talks to it only through
   `model.start`, `model.reply` and `model.report`, so connecting it means replacing
   `placeholderModel` below with a client that calls the real service and returns the
   same shapes. Everything the model sends back goes through `validateTurn` /
   `validateReport` before it is shown.

   What the placeholder does NOT do: its barista lines follow a fixed order and don't read
   what the learner wrote, and its "notes" come from three hand-written pattern checks. It
   exists so the interface can be clicked through, not to stand in for the model's quality.

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
            pattern: string, next: string }

   Calls
   -----
   start({ settings })                  -> Promise<Turn>     the barista's opening line
   reply({ history, settings })         -> Promise<Turn>     history: [{ who: 'ai'|'you', zh }]
   report({ history, notes, settings }) -> Promise<Report>
*/

export const MODEL_INFO = {
  connected: false,
  name: 'Placeholder',
  detail: "Placeholder replies. The conversation model isn't connected yet.",
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

export const model = placeholderModel;
