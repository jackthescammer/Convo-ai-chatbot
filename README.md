# Convo AI

**Track:** Languages
**Team:** Nelson, Ethan and Ferrell

## The problem
Many immigrants learn Chinese vocabulary and grammar but freeze in real conversations, like ordering at a cafe. Apps built on memorisation and scripted dialogues don't give them practice at responding to a real person. An example stakeholder would be an A2 learner who just moved to a Chinese-speaking city.

## What we built
A text conversation partner for Chinese learners.
- **Input:** a learner's Chinese sentence, written in a cafe-ordering conversation.
- **Output:** an in-character reply from an AI waiter, plus a correction and a short explanation if the learner made a mistake.
- **Who uses it:** an A2-level immigrant practising before real situations.

The long-term vision is a full platform with many scenarios, voice and text, and personalised grading. This weekend we built and tested only the first slice: **one scenario (cafe), one language (Chinese), text only.**

## What we added
This is our own idea, not a suggested project. What we added:
- **Our own user:** an immigrant at A2 level who needs everyday Chinese, practising one real situation: ordering at a cafe.
- **Our own data:** a test set of 42 cafe sentences a learner might say (`data/test_cases.csv`, shown in full in [DATA.md](DATA.md)). 28 contain a common beginner mistake (word order, extra words, measure words, question structure and others) and 14 are correct. We wrote them with help from Claude, and Nelson and Ferrell checked and corrected every sentence.
- **Our own question:** can a small, free, open-source model (Qwen 2.5 3B) catch beginner mistakes, explain them, and stay in character as a waiter, without "correcting" sentences that were already right?

## How it works
- **Data:** our 42 learner sentences (28 with a mistake, 14 correct), each with the correct version (or several, where more than one answer is right) and the mistake type. We used 10 to tune the prompt and kept the other 32 as a held-out test set. Every prompt change was chosen using the 10 tune sentences only.
- **Model:** Qwen 2.5 3B Instruct (open-source, run in Google Colab). We used a prompt that tells it to play a waiter, reply in Chinese and correct mistakes gently.
- **Why this model:** small enough for a free GPU, and it supports Chinese.

## Results

### Improving the prompt (tune sentences: 7 with a mistake, 3 correct)
We changed one thing per version and measured it on the 10 tune sentences. Full details and raw result files: [results/VERSIONS.md](results/VERSIONS.md) and [results/](results/).

| Version | What changed | Mistakes caught | Corrections matching our answer | Correct sentences wrongly "fixed" | Waiter stayed in character | Remembered the order |
|---|---|---|---|---|---|---|
| Baseline | Never corrects anything | 0/7 | n/a | 0/3 | n/a | n/a |
| v1 | First prompt | 6/7 | 4/7 | 2/3 | 30/30 | 6/6 |
| v2 | Stronger written rule: don't change correct sentences | 6/7 | 4/7 | 2/3 | 30/30 | 6/6 |
| v3 | Added worked examples of correct sentences left unchanged | 5/7 | 4/7 | 0/3 | 30/30 | 6/6 |
| v4 | Added worked examples of real word-choice and measure-word mistakes | 7/7 | 6/7 | 2/3 | 30/30 | 6/6 |
| v5 | Second check in code: "is the original already correct?" | 4/7 | 3/7 | 1/3 | 30/30 | 6/6 |
| **v6** | Second check shows original and fix side by side, keeps the original unless the fix is clearly better | **7/7** | **6/7** | 1/3 | 30/30 | 6/6 |

**Is it improving?** Yes. From v1 to v6, corrections matching our answer went from **4/7 to 6/7**, mistakes caught from 6/7 to **7/7**, and correct sentences wrongly "fixed" from 2/3 to 1/3. It wasn't a straight line, and the dead ends taught us the most:
- A written rule (v2) changed nothing. Worked examples (v3) stopped the over-correcting, but made the model too cautious.
- Examples of real mistakes (v4) brought the catches back, but the over-correcting returned too. Prompt examples alone swung between the two problems.
- So we split "is it wrong?" from "how do I fix it?" with a second check in code. Asking about the sentence on its own (v5) failed, because the model said "it's fine" far too easily. Showing the original and the fix side by side (v6) worked: it kept all of v4's catches and removed one of its two over-corrections.

The waiter stayed in character and remembered the order in every test conversation in every version. With only 10 tune sentences, one sentence moves a score by 14 to 33 points, so the final test on 32 unseen sentences is the real measure.

### Final score (held-out test sentences)
TODO: run once on the 32 test sentences when the prompt is final, and report it here next to the baseline.

Note: the test sentences were also run once early, with v1 (19/21 mistakes flagged, 3/21 corrections matching, 6/11 correct sentences wrongly "fixed"). We did not use those results to choose any prompt change; we report them here for honesty.

Nelson and Ferrell checked all the quiz sentences. TODO: who judged the corrections by hand.

**Where it fails (v6, tune sentences):**
- 我喝咖啡在家 (should be 我在家喝咖啡) → "fixed" to 我要喝咖啡在家. No version has moved the place phrase 在家 before the verb; the model keeps rewriting the verb instead.
- 我要买单 (already correct, "I'd like the bill") → changed to 我要付钱 ("I want to pay"). The side-by-side check accepts it because both sound fine to the model.
- Explanations: only about half are in English (4 of 8 in v6, up from 0 in v3); the rest are in Chinese, which an A2 learner can't use. Some explanations are also wrong, so they need checking by hand.

We think a 3B model follows examples better than written rules, and judges two options side by side better than one sentence on its own.

## Limitations
- Text only. Voice (Whisper) and spoken replies (TTS) are not built.
- One scenario and one level.
- Small quiz: 10 tune and 32 test sentences, so scores move a lot with one sentence.
- About half the explanations still come out in Chinese instead of English, and some are wrong.
- The test sentences were run once early (v1), before we fixed our rule of running them only at the end.

## What we'd do next
1. Add Whisper so learners can speak.
2. Add more scenarios and levels, then test with real learners.

## Sources
- Qwen 2.5 3B Instruct (Hugging Face): https://huggingface.co/Qwen/Qwen2.5-3B-Instruct
- Hugging Face Transformers: https://huggingface.co/docs/transformers
- Google Colab: https://colab.research.google.com
- AI tools used: Claude (Anthropic), for help planning, writing the starter notebook and drafting the test sentences
- TODO: any dataset or tutorial
