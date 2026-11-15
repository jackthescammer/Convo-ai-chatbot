# Team testing (by hand, on the live website)

We tested Convo ourselves on [tryconvo.vercel.app](https://tryconvo.vercel.app) and wrote down every message. These are real uses by the team, not a scored test.

**How to add a row:** after each message, write what you typed, what the character replied and what Live feedback said, then judge it. Copy the replies exactly. Mark ✅ if Convo did the right thing, ❌ if not, and say why in "Notes". Wrong answers are useful data: keep them.

**Prompt version:** check the footer of the conversation page ("prompts v…") and note it once per session.

## What to try (aim for a few of each)

| Type | Examples |
|---|---|
| Correct sentence | 我要一杯咖啡。 / 请给我菜单。 |
| Beginner mistake | 我要一个咖啡。 / 我想吃一杯茶。 / 我喝咖啡在家。 |
| Pinyin without tones | wo yao yi bei kafei |
| Pinyin with tones | wǒ yào yì bēi kāfēi / wo3 yao4 |
| Misspelt pinyin | wo yeao kafie |
| Not answering | ni hao (when asked what you'd like) |
| Off-topic | 我喜欢踢足球 |
| Not appropriate (keep it mild) | 你很笨 |
| Other scenarios | restaurant, shop, interview, open chat |

## Results

| # | Tester | Scenario, level | Prompts | You typed | Character replied | Live feedback said | Right? | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 |Ethan|Cafe,A1|v11 pinyin|Ni Hao|Nín hǎo, qǐng wèn yào hē diǎn shén me?|You wrote Ni Hao Stay in the conversation You didn't answer the question. 请询问您想要点的饮品 We read it as 你好 Your Chinese itself was fine. Tones You left out the tone marks. Pinyin needs them, because the tone changes the meaning. With tones: nǐ hǎo|Correct| |
| 2 |Ethan|Cafe,A1|v11 汉字|我想要一杯冰茶。|好的，来一杯冰茶。|Good job! That's correct.|Correct|Probably more difficult to reply to with the conversation, need to continue|
| 3 | | | | | | | | |

## Summary (fill in at the end)

- Messages tested: 
- Corrections right: __ / __
- Pinyin tone and spelling help right: __ / __
- Not-answering and off-topic handled right (warning shown and character steered back): __ / __
- Biggest problems we saw:
