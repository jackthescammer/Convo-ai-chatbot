# Convo AI

**Track:** Languages
**Team:** TODO names

## The problem
Many immigrants learn Chinese vocabulary and grammar but freeze in real conversations, like ordering at a cafe. Apps built on memorisation and scripted dialogues don't give them practice at responding to a real person. TODO: name one real person or persona (e.g. "an A2 learner who just moved to a Chinese-speaking city").

## What we built
A text conversation partner for Chinese learners.
- **Input:** a learner's Chinese sentence, written in a cafe-ordering conversation.
- **Output:** an in-character reply from an AI waiter, plus a correction and a short explanation if the learner made a mistake.
- **Who uses it:** an A2-level immigrant practising before real situations.

The long-term vision is a full platform with many scenarios, voice and text, and personalised grading. This weekend we built and tested only the first slice: **one scenario (cafe), one language (Chinese), text only.**

## What we added
TODO: our own user, data or question. For example: "We wrote our own test set of N learner sentences with known mistakes, checked by a Chinese speaker, and measured how often the model corrects them properly."

## How it works
- **Data:** TODO: N learner sentences we wrote (X with a mistake, Y correct), each with the correct version and mistake type. Split: TODO tuning set / TODO held-out test set. The model never saw the test set when we tuned the prompt.
- **Model:** Qwen 2.5 3B Instruct (open-source, run in Google Colab). We used a prompt that tells it to play a waiter, reply in Chinese and correct mistakes gently.
- **Why this model:** small enough for a free GPU, and it supports Chinese.

## Results
| | Mistakes caught | Correct sentences wrongly "fixed" | Corrections judged right |
|---|---|---|---|
| Baseline (always replies "sounds good!", never corrects) | 0 | 0 | n/a |
| Convo (Qwen 2.5 3B) | TODO | TODO | TODO |

All numbers are on held-out sentences we did not use to tune the prompt. A Chinese speaker judged the corrections: TODO who.

**Where it fails:** TODO: paste 2-3 wrong examples, with the model's output next to the correct one, and explain why we think it failed.

## Limitations
- Text only. Voice (Whisper) and spoken replies (TTS) are not built.
- One scenario and one level.
- TODO: anything else honest, e.g. small test set.

## What we'd do next
1. Add Whisper so learners can speak.
2. Add more scenarios and levels, then test with real learners.

## Sources
- Qwen 2.5 3B Instruct (Hugging Face): TODO link
- Google Colab: https://colab.research.google.com
- AI tools used: TODO (e.g. Claude, for help planning and writing starter code)
- TODO: any dataset or tutorial
