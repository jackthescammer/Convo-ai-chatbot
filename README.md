# Convo AI

**Track:** Languages
**Team:** Nelson, Ethan and Ferrell

## The problem
Many immigrants learn Chinese vocabulary and grammar but freeze in real conversations, like ordering at a cafe. Apps built on memorisation and scripted dialogues don't give them practice at responding to a real person. TODO: name one real person or persona (e.g. "an A2 learner who just moved to a Chinese-speaking city").

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
- **Data:** our 42 learner sentences (28 with a mistake, 14 correct), each with the correct version (or several, where more than one answer is right) and the mistake type. We used 10 to tune the prompt and kept the other 32 as a held-out test set. We didn't change the prompt after scoring the test set.
- **Model:** Qwen 2.5 3B Instruct (open-source, run in Google Colab). We used a prompt that tells it to play a waiter, reply in Chinese and correct mistakes gently.
- **Why this model:** small enough for a free GPU, and it supports Chinese.

## Results
| | Mistakes caught | Correct sentences wrongly "fixed" | Corrections judged right |
|---|---|---|---|
| Baseline (always replies "sounds good!", never corrects) | 0 | 0 | n/a |
| Convo (Qwen 2.5 3B) | TODO | TODO | TODO |

All numbers are on held-out sentences we did not use to tune the prompt. Nelson and Ferrell checked the test sentences. TODO: who judged the corrections by hand.

**Where it fails:** TODO: paste 2-3 wrong examples, with the model's output next to the correct one, and explain why we think it failed.

## Limitations
- Text only. Voice (Whisper) and spoken replies (TTS) are not built.
- One scenario and one level.
- TODO: anything else honest, e.g. small test set.

## What we'd do next
1. Add Whisper so learners can speak.
2. Add more scenarios and levels, then test with real learners.

## Sources
- Qwen 2.5 3B Instruct (Hugging Face): https://huggingface.co/Qwen/Qwen2.5-3B-Instruct
- Hugging Face Transformers: https://huggingface.co/docs/transformers
- Google Colab: https://colab.research.google.com
- AI tools used: Claude (Anthropic), for help planning, writing the starter notebook and drafting the test sentences
- TODO: any dataset or tutorial
