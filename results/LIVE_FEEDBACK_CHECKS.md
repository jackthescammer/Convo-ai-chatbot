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

## Pinyin spelling help (added after these checks)

Words that aren't pinyin (or only split oddly, like yeao → ye + ao) get a suggested syllable, its character and a reason, and a "Try saying" example shows the whole sentence done right. Unit tests: `tests/test_pinyin_spelling.py`. Live results will be added here once it has been run on the live model.
