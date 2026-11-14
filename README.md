# Convo AI

**Track:** Languages
**Team:** Nelson, Ethan and Ferrell
**Try it:** [tryconvo.vercel.app](https://tryconvo.vercel.app) (the live chat works while our model is running)

> **Main takeaway:** a free, small AI model (Qwen 2.5 3B) can coach beginner café Chinese. Our best version caught 7/7 beginner mistakes and fixed 6/7 correctly, compared with 0 for a baseline that never corrects. Showing the model examples worked far better than giving it rules.

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
We changed one thing per version (full details: [VERSIONS.md](results/VERSIONS.md); analysis: [DATA.md](DATA.md#data-analysis)).

| Tune sentences | Mistakes caught | Fixed correctly | Correct sentences wrongly "fixed" |
|---|---|---|---|
| Baseline (never corrects) | 0/7 | 0/7 | 0/3 |
| v1: first prompt | 6/7 | 4/7 | 2/3 |
| v2: stronger written rule | 6/7 | 4/7 | 2/3 |
| v3: examples of correct sentences | 5/7 | 4/7 | 0/3 |
| v4: examples of real mistakes | 7/7 | 6/7 | 2/3 |
| v5: second check, original on its own | 4/7 | 3/7 | 1/3 |
| **v6: second check, original vs fix side by side** | **7/7** | **6/7** | **1/3** |

A written rule (v2) changed nothing. Examples stopped the over-correcting (v3) but made the model too cautious, and examples of real mistakes (v4) brought the over-correcting back. Splitting "is it wrong?" from "how do I fix it?" worked once the model compared the original and the fix side by side (v6). The waiter stayed in character in 30/30 turns and remembered the order in 6/6 chats in every version.

**Final score (32 unseen sentences):** TODO, v6 vs baseline. The test sentences were also run once early by mistake with v1 (19/21 caught, 3/21 fixed correctly, 6/11 wrongly "fixed"); we never used those results to choose a change.

**Real examples (v6):**

| Learner wrote | Convo's fix | Correct answer | |
|---|---|---|---|
| 我想吃一杯咖啡。 | 我想喝一杯咖啡。 | 我想喝一杯咖啡。 | ✅ 喝 for drinks |
| 我要一杯面包。 | 我要一块面包。 | 我要一块面包。 | ✅ measure word |
| 我喝咖啡在家。 | 我要喝咖啡在家。 | 我在家喝咖啡。 | ❌ never moves 在家 before the verb |
| 我要买单。 (already correct) | 我要付钱。 | (no change) | ❌ rewrites a correct sentence |

**Where it fails:** word-order mistakes, rewriting some correct sentences, and explanations: only about half come out in English, which an A2 learner needs. TODO: who checked Convo's corrections by hand, and what a real learner said after trying it.

## Limitations
- Small quiz (10 tune, 32 test), so one sentence moves a score a lot.
- Text only on the main version; one scenario.
- The live chat link only works while our model is running in Colab.

## What we'd do next
1. Force English explanations.
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
