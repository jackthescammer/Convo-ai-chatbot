# Convo AI

**Track:** Languages
**Team:** Nelson, Ethan and Ferrell
**Try it:** [tryconvo.vercel.app](https://tryconvo.vercel.app) (the live chat works while our model is running)

> **Main takeaway:** a free, small AI model (Qwen 2.5 3B) can start to coach beginner café Chinese, but it isn't reliable yet. On 32 sentences it had never seen, our best version fixed 7/21 mistakes correctly (first version: 3/21) and wrongly changed 2/11 correct sentences (first version: 6/11); a baseline that never corrects fixes 0. Showing the model examples worked far better than giving it rules.

## The problem
Many immigrants learn Chinese vocabulary and grammar but freeze in real conversations, like ordering at a café. Apps built on memorisation and scripted dialogues don't give them practice at responding to a real person. An example stakeholder would be an A2 learner who just moved to a Chinese-speaking city.

## What we built
A web app where you practise ordering at a café with an AI waiter, 小林.
- **Set up:** choose your level (A1 or A2), the difficulty, and whether to see Chinese characters, pinyin and/or English.
- **Chat:** type in Chinese. 小林 replies in character, keeps track of your order and asks follow-up questions.
- **Report:** at the end, Convo checks every sentence you wrote and shows corrections, explanations and an overall assessment.

The long-term vision is a full platform with many scenarios, voice and grading (see [Convo-AI.md](Convo-AI.md)). This weekend we built and tested the first slice: **one scenario, one language, text input.**

## What we added
Our own idea, not a suggested project.
- **Our own user:** an A2-level immigrant practising one real situation.
- **Our own data:** 42 café sentences a learner might say, 28 with a common beginner mistake and 14 already correct. We wrote them with help from Claude; Nelson and Ferrell checked every one. Full list: [DATA.md](DATA.md).
- **Our own question:** how do you get a small model to correct beginners well: with rules, with examples, or with a second check?

## How it works
- **Model:** Qwen 2.5 3B Instruct (open source, runs on a free Google Colab GPU). One prompt plays the waiter; a separate checker reviews each learner sentence.
- **Testing:** 10 sentences to improve the checker ("tune"), 32 kept unseen for the final score ("test"). Every change was chosen using the tune sentences only.
- **Baseline:** a waiter that never corrects anything.

## Results

**Final score (32 sentences the model never saw while we improved it: 21 with a mistake, 11 correct):**

| Test sentences | Mistakes caught | Fixed correctly | Correct sentences wrongly "fixed" |
|---|---|---|---|
| Baseline (never corrects) | 0/21 | 0/21 | 0/11 |
| v1: first prompt (run once early, by mistake) | 19/21 | 3/21 (14%) | 6/11 (55%) |
| **v6: final** | **15/21** | **7/21 (33%)** | **2/11 (18%)** |

v6 fixes more than twice as many mistakes correctly as v1 and over-corrects far less, but lets more mistakes through. Best on measure words (3/3 fixed), worst on question structure, negation and missing particles (0 fixed). We never used these results to choose a change.

**How we improved it (10 tune sentences, one change per version):**

| Tune sentences | Caught | Fixed correctly | Wrongly "fixed" |
|---|---|---|---|
| Baseline | 0/7 | 0/7 | 0/3 |
| v1: first prompt | 6/7 | 4/7 | 2/3 |
| **v6: second check, original vs fix side by side** | **7/7** | **6/7** | **1/3** |

A written rule (v2) changed nothing; worked examples helped but swung between over- and under-correcting (v3, v4); a second check only worked once it compared the original and the fix side by side (v6). Tune gains only partly carried over to unseen sentences. The waiter stayed in character in every test conversation. All six versions: [VERSIONS.md](results/VERSIONS.md); full analysis: [DATA.md](DATA.md#data-analysis).

**Real examples (v6, unseen sentences):**

| Learner wrote | Convo's fix | Correct answer | |
|---|---|---|---|
| 我们两个人要一桌子。 | 我们两个人要一张桌子。 | 我们两个人要一张桌子。 | ✅ measure word |
| 他要也一杯咖啡。 | 他也要一杯咖啡。 | 他也要一杯咖啡。 | ✅ word order |
| 我昨天不喝咖啡。 | (no change) | 我昨天没喝咖啡。 | ❌ missed 不 vs 没 |
| 我不会说中文很好。 | 我不會說中文很好。 | 我中文说得不好。 | ❌ switched to traditional characters, mistake kept |
| 谢谢，咖啡来得很快。 (already correct) | 谢谢，咖啡快来了。 | (no change) | ❌ changed a correct sentence's meaning |

**Where it fails:** 5 of the 6 mistakes it missed were spotted by the first check, then wrongly undone by the second check. Only 10 of 17 explanations came out in English, which an A2 learner needs.

TODO: who checked Convo's corrections by hand, and what a real learner said after trying it.

## Limitations
- Small quiz (10 tune, 32 test), so one sentence moves a score a lot.
- Text only on the main version; one scenario.
- The live chat link only works while our model is running in Colab.

## What we'd do next
1. Make the second check less eager to undo real corrections, then force English explanations.
2. Voice input with Whisper (in progress on the `phase2-whisper` branch), tested per speaker.
3. More scenarios, then testing with real learners.

## Sources
- Qwen 2.5 3B Instruct: https://huggingface.co/Qwen/Qwen2.5-3B-Instruct
- Hugging Face Transformers: https://huggingface.co/docs/transformers
- Gradio (chat app): https://www.gradio.app
- pypinyin (pinyin display): https://github.com/mozillazg/python-pinyin
- Google Colab: https://colab.research.google.com
- Vercel (website hosting): https://vercel.com
- AI tools: Claude (Anthropic), for planning, code, drafting the test sentences and analysis
