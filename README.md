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
- **Live feedback:** after each reply, your message is checked straight away by the same checker: the fix and why (in English), or "Good job!" if it's right. If you type **pinyin**, Convo reads it as characters first, tells you about missing or wrong **tone marks**, flags **misspelt** words with what you probably meant and why, and shows a "Try saying" example. The tone and spelling help is rule-based (pypinyin and a syllable list), not the model, and the checker itself is unchanged, so the scores below still apply. Spot checks against the live model: [LIVE_FEEDBACK_CHECKS.md](results/LIVE_FEEDBACK_CHECKS.md).

The long-term vision is a full platform with many scenarios, voice and grading (see [Convo-AI.md](Convo-AI.md)). This weekend we built and tested the first slice: **one scenario, one language, text input.**

**More conversations (prompts v7, not evaluated yet).** Besides the café you can now pick buying things at a shop (小王), ordering at a restaurant (小李), a job interview (刘经理, hiring for a bookshop) or an open conversation (小雨, who picks the topics and leads). All five share the same engine, checker and report; each one's character, flow, surprises and checker context live in [`convo/scenarios.py`](convo/scenarios.py). The café prompts are word for word the v6 ones (a test checks this), so the results below still describe the café. The other four have not been scored: run `python -m convo.evaluation conversation --scenario <id>` and review the transcripts before trusting them.

The website calls `/start_scenario` and `/check_scenario` (they add a scenario input). `/start` and `/check` are unchanged and always mean the café, so a website from before scenarios keeps working.

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
- Text only on the main version. Five conversations, but only the café has been evaluated, and the correction test set is café sentences.
- The live chat link only works while our model is running in Colab.
- Live feedback is backed by spot checks, not a scored test ([LIVE_FEEDBACK_CHECKS.md](results/LIVE_FEEDBACK_CHECKS.md)). The turn check (prompts v10) spotted a non-answer and an off-topic message correctly, and the barista re-asked after the non-answer, but in v10 it followed off-topic messages instead of steering back. With a firmer fix (v11) it steered back in our one re-test, which is too few tries to be sure.

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
