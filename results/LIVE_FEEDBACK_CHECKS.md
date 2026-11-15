# Live feedback: spot checks

Live feedback checks each message during the conversation, not only in the end-of-chat report. It uses the **same checker as the scored tests** (`convo/review.py`, unchanged), so the v6 scores in [VERSIONS.md](VERSIONS.md) still describe its corrections. What it adds around the checker is display help: English explanations, and tone and spelling help for pinyin.

These are **spot checks**, not a scored test: each row is one real call to the live model (Qwen2.5-3B-Instruct on a Colab T4 GPU, temperature 0) through the website's "check" API, with the exact input and what came back. Recorded by Ethan's Claude on 2026-11-15.

## Corrections (characters)

| Sent | Result | Right? |
|---|---|---|
| 我要一个杯茶。 | Measure words: → 我要一杯茶。 "杯 (cups) is used for liquid items like tea…" | ✅ |
| 我想吃一杯咖啡。 | Word choice: → 我想喝一杯咖啡。 "吃 (eat) is used for food, while 喝 (drink) is used for beverages…" | ✅ |
| 我要一杯拿铁，不要糖。 (already correct) | Looks right | ✅ |
| 这是我朋友咖啡。 | → 这是我的朋友的咖啡。 (should be 这是我朋友的咖啡) | ❌ wrong fix, same as in the v6 test |
| 我昨天不喝咖啡。 | Looks right (should be 没喝) | ❌ missed, same as in the v6 test |

Each check took about 4 to 7 seconds.

## English explanations

The checker sometimes explains in Chinese, which an A2 learner can't read. When an explanation is mostly Chinese, the server asks the model for a short English version (display only).

| Sent | Before | After |
|---|---|---|
| wo xiang chi yi bei kafei | 吃 (eat) 应用于食物，喝 (drink) 应用于饮料。在这里应该使用喝。 | The correct sentence is "我想喝一杯咖啡" because "吃" is used for food, not drinks, so "喝" should be used instead. |

A first version of this rule rejected English rewrites that quoted a Chinese sentence; it now compares how much of the text is Chinese vs English.

## Pinyin: reading and tones

Pinyin is read as its most likely characters first (a dictionary lookup, never the model), then checked. Tones are compared with pypinyin's reading of those characters.

| Typed | Read as | Tone feedback |
|---|---|---|
| ni hao | 你好 | No tone marks; with tones: nǐ hǎo |
| nǐ hǎo | 你好 | Tones right |
| ni2 hao3 | 你好 | 1 wrong: ni2 → nǐ |
| wǒ yào yì bēi kāfēi | 我要一杯咖啡 | Tones right (yì accepted for 一) |
| wo yao he yi ge bing cha | 我要喝一个冰茶 | No tone marks; with tones: wǒ yào hē yí gè bīng chá. Also measure words: → 我要喝一杯冰茶 |
| hello | (skipped) | "'hello' doesn't look like pinyin" |
| ??? | (skipped) | no model call |

## Restaurant opening line (prompts v9)

Before v9 the restaurant server once opened with a customer's line (您好，请问有空位吗？). After the v9 prompt fix, five new restaurant conversations opened with:

| Level, difficulty | Opening line |
|---|---|
| A1 Easy | 您好，几位？ |
| A2 Standard | 您好，请问几位？ |
| A2 Challenging | 您好，请问几位？ |
| A1 Standard | 您好，请问几位？ |
| A2 Easy | 您好，请问几位？ |

5/5 correct. This only checks the first line; later turns were not checked.

## Pinyin spelling help

Words that aren't pinyin (or only split oddly, like yeao → ye + ao) get a suggested syllable, its character and a reason, and a "Try saying" example shows the whole sentence done right. The suggestions are rule-based (a syllable list, edit distance and the café word list), not the model. Unit tests: `tests/test_pinyin_spelling.py`.

| Typed | Spelling help | Then | Right? |
|---|---|---|---|
| wo yeao yir ge bing cha | yeao → yao 要 ("can only be read as ye + ao"); yir → yi 一 ("only 'er' ends in r") | Read as 我要一个冰茶 → measure words: 我要一杯冰茶。 Try saying: 我要一杯冰茶。 wǒ yào yī bēi bīng chá, "I would like a cup of iced tea." | ✅ |
| nihao | none (real word left alone) | Read as 你好, no tone marks | ✅ |
| wo yao kafie (first version) | kafie → **kai 开** | Read as 我要开 ("I want to open") | ❌ |
| wo yao kafie (after the fix) | kafie → **kafei 咖啡** | Read as 我要咖啡. Try saying: 我要咖啡 wǒ yào kā fēi, "I would like a cup of coffee." | ✅ |

**Bug found and fixed:** "kafie" (letters swapped) was first matched to the single syllable kai, because suggestions only looked at single syllables and a swap counted as two typos. Now a swap counts as one typo and whole café words can be suggested. After a restart the live model gave kafei 咖啡, and the other two rows above gave the same results as before.

The spelling and "Try saying" sections were also checked visually on the live website (tryconvo.vercel.app) with "wo yeao yir ge bing cha".

## Turn check: not answering or going off-topic (prompts v10)

The barista asked what the customer wanted, the learner only said "Ni hao", and the barista replied "hot or iced?" as if a drink had been ordered. The v10 turn check sorts each message into answer / no answer / off-topic / not appropriate, gives the character a one-off instruction when it isn't an answer, and shows a warning in live feedback. Café conversations, A2 Easy, through the live API:

| Barista asked | Learner | Barista replied | Warning | Right? |
|---|---|---|---|---|
| 你今天想喝点什么？ | ni hao | 您好，你今天想喝点什么？ (asks again) | didn't answer | ✅ |
| 需要点些什么吗？ | 我喜欢踢足球 ("I like playing football") | 那你平时喜欢做什么呢？ (followed the new topic) | off-topic | ❌ barista |
| 有什么可以帮到您吗？ | 我要一杯咖啡 | 好的，您要加糖吗？ | none | ✅ |

Detection was right 3/3, but the barista ignored the steer-back note for the off-topic message. The note was at the end of the learner's message; it now goes into the system prompt for that one reply and is firmer ("do NOT talk about it… ask again what you asked before"). Re-test results below once that is live.
