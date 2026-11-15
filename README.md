# Convo AI: a Mandarin conversation partner for beginners

**Track:** AI + Languages · **Team:** Nelson Wang, Ferrell Dong, Ethan Cao
**Try it:** [tryconvo.vercel.app](https://tryconvo.vercel.app) (live chat works while our model is running) · **Demo video:** TODO
**Version:** prompts v12. The mistake checker was scored at v6; v7 to v12 added features without changing it.

> **Main takeaway:** a free, small AI model (Qwen 2.5 3B) can start to coach beginner Chinese, but it isn't reliable yet. On 32 unseen sentences, our best checker fixed 7/21 mistakes correctly (first version: 3/21; a never-correct baseline: 0) and wrongly changed 2/11 correct sentences (first version: 6/11). Showing the model examples worked far better than giving it rules.

## The problem
Many immigrants learn Chinese vocabulary and grammar but freeze in real conversations, like ordering at a café. Apps built on memorisation and scripted dialogues don't give them practice at responding to a real person. An example stakeholder would be an A2 learner who just moved to a Chinese-speaking city.

## What we built
A website where you practise a real situation by chatting with an AI character: a café (our main, tested scenario), a shop, a restaurant, a job interview or an open chat. You type in characters or pinyin, or use the mic, and after each reply Convo checks your message. On the live model:

> **Barista:** 欢迎光临，请问需要些什么吗？
> **You:** wo yeao yir ge bing cha
> **Live feedback:** Spelling: yeao → yao 要, yir → yi 一 (with why). Measure words: 一个 → 一杯. Tones: you left out the tone marks. **Try saying:** 我要一杯冰茶。 wǒ yào yī bēi bīng chá.

A correct message gets **Good job!**; not answering, going off-topic or replying in English gets a warning, and the character asks again. A report and a Progress page follow each conversation.

## What we added
Our own idea (4.4.4), with **our own user** (an A2 immigrant), **our own data** (42 café sentences, 28 with a beginner mistake and 14 correct, written with Claude's help and checked by Nelson and Ferrell: [DATA.md](DATA.md)), and **our own question**: does a small model correct beginners better with rules, examples or a second check?

## How it works
- **Model:** Qwen 2.5 3B Instruct on a free Colab GPU. One prompt plays the character; a separate checker reviews each sentence.
- **Testing:** 10 sentences to improve the checker ("tune"), 32 kept unseen for one final score ("test"). Baseline: a checker that never corrects.
- **Our improvement:** a written rule (v2) changed nothing; examples swung between over- and under-correcting (v3, v4); a second check only worked once it compared the original and the fix side by side (v6).
- **Live feedback:** the same v6 checker after every message, plus rule-based pinyin help (tones, spelling, English detection) and a check for off-script replies.

## Results

| v6 checker, 32 unseen café sentences | Mistakes caught | Fixed correctly | Correct sentences wrongly "fixed" |
|---|---|---|---|
| Baseline (never corrects) | 0/21 | 0/21 | 0/11 |
| v1 (run once early, by mistake) | 19/21 | 3/21 | 6/11 |
| **v6 (final)** | **15/21** | **7/21** | **2/11** |

v6 fixes more than twice as many mistakes as v1 and over-corrects far less, but lets more through. On the 10 tune sentences it fixed 6/7, so the gains only partly carried over. Best on measure words (3/3), worst on question structure, negation and missing particles (0).

| Version | Change | Result |
|---|---|---|
| v1 to v5 | Checker prompts: rule, examples, a first second check | tune: fixed 3/7 to 6/7, wrongly "fixed" 0/3 to 2/3 |
| **v6** | Second check compares original and fix | tune 6/7 fixed, 1/3 wrong; **test 7/21, 2/11** |
| v7, v8 | Shop, restaurant, interview, open chat; realistic China settings | not evaluated |
| v9 | Restaurant opened with a customer's line; fixed | 5/5 live openers right |
| v10, v11 | Check for no answer / off-topic, then a firmer steer-back | v11: 3/3 live chats right |
| v12 | English was "corrected" as pinyin; now detected | 6/6 detected |

Full details: [VERSIONS.md](results/VERSIONS.md) and [DATA.md](DATA.md#data-analysis). v7 to v12 are spot checks ([LIVE_FEEDBACK_CHECKS.md](results/LIVE_FEEDBACK_CHECKS.md), [TEAM_TESTS.md](results/TEAM_TESTS.md)), not a scored test.

**Where it fails**

| Learner wrote (unseen) | Convo's fix | Correct |
|---|---|---|
| 我昨天不喝咖啡。 | (no change) | 我昨天没喝咖啡。 |
| 我不会说中文很好。 | 我不會說中文很好。 (traditional characters) | 我中文说得不好。 |
| 谢谢，咖啡来得很快。 (correct) | 谢谢，咖啡快来了。 (meaning changed) | (no change) |

- 5 of the 6 missed mistakes were spotted, then wrongly undone by the second check.
- The character doesn't always keep the conversation going (after 我想要一杯冰茶。 it only confirmed), and after an English reply it didn't fully steer back.
- Only the café is evaluated, the quiz is small, and the live chat only works while our model runs in Colab.

## What we'd do next
1. Make the second check less eager to undo real corrections.
2. Make the character always end with a follow-up question.
3. Evaluate the other scenarios, and test with real A2 learners.

## Sources
Our 42 test sentences ([data/test_cases.csv](data/test_cases.csv)); [Qwen 2.5 3B Instruct](https://huggingface.co/Qwen/Qwen2.5-3B-Instruct) with [Hugging Face Transformers](https://huggingface.co/docs/transformers); [Gradio](https://www.gradio.app); [pypinyin](https://github.com/mozillazg/python-pinyin) (pinyin and tones); [Pinyin2Hanzi](https://github.com/letiantian/Pinyin2Hanzi) (pinyin to characters); [Google Colab](https://colab.research.google.com) (GPU); [ngrok](https://ngrok.com) (fixed link to the model); [Vercel](https://vercel.com) (website); [ElevenLabs](https://elevenlabs.io) (spoken voices); the browser's [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) (mic input).

**AI tools:** Claude (Anthropic), used a lot for planning, code, the website, the analysis and drafting the test sentences (checked by Nelson and Ferrell). We tested every feature on the live model ourselves.
