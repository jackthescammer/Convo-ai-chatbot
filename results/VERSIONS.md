# Version history

Model: Qwen/Qwen2.5-3B-Instruct, temperature 0 (runs are repeatable). Run in Google Colab on a T4 GPU.
Scores are on the **tune** split only (10 sentences: 7 with a mistake, 3 correct). The test split is run once, at the end.
Never delete or edit old rows; add a new row per version.

| Version | Date | What changed and why | Mistakes caught | Corrections matching | False corrections | Character consistency | Context retained |
|---|---|---|---|---|---|---|---|
| Baseline | n/a | Waiter that never corrects anything | 0/7 | n/a | 0/3 | n/a | n/a |
| v1 | 2026-11-14 | First prompt | 6/7 | 4/7 (57%) | 2/3 (67%) | 30/30 | 6/6 |
| v2 | 2026-11-14 | Stronger rule: don't change sentences that are already correct (v1 wrongly fixed 2 of 3) | 6/7 | 4/7 (57%) | 2/3 (67%) | 30/30 | 6/6 |
| v3 | 2026-11-14 | Added 3 worked examples of correct sentences left unchanged (false corrections were 2/3 in v1 and v2) | 5/7 | 4/7 (57%) | **0/3 (0%)** | 30/30 | 6/6 |
| v4 | 2026-11-14 | Added 2 worked examples of real word-choice and measure-word mistakes, with English explanations (v3 missed 吃→喝 and 一杯面包) | 7/7 | 6/7 (86%) | 2/3 (67%) | 30/30 | 6/6 |
| v5 | 2026-11-14 | Second check in code: ask "is the original already correct?" before accepting a fix (v4 over-corrected 2/3) | 4/7 | 3/7 (43%) | 1/3 (33%) | 30/30 | 6/6 |
| v6 | 2026-11-14 | Second check shows original and fix side by side; keep the original unless the fix is clearly better (v5's check said "fine" too easily) | **7/7** | **6/7 (86%)** | 1/3 (33%) | 30/30 | 6/6 |

Targets we set: correction accuracy at least 85%, false-correction rate at most 10%.

## v1 notes

**What went well**
- Every reply was valid and parseable (10/10), and the waiter stayed in character in Chinese for all 30 conversation turns.
- It remembered the order in all 6 scripted chats.
- Correct fixes: 我喝咖啡在家 → 我在家喝咖啡; 这个蛋糕太很甜了 → 这个蛋糕太甜了; 我没有钱现金 → 我没有现金; 我希望获得一杯咖啡 → 我想要一杯咖啡.

**What went wrong**
- **Over-correcting (2 of 3 correct sentences changed):** 我要一杯拿铁，不要糖。 → 我要一杯拿铁，不要加糖。, with an explanation that made no sense; 我要买单。 → 我买单。, wrongly calling the original unnatural.
- **Missed a mistake:** 我想吃一杯咖啡。 (should be 喝) was not flagged.
- **Flagged but fixed wrongly:** 我要一杯面包。 → 我想要一杯面包。 (kept the wrong measure word 杯).
- **Counted as a miss but actually fine:** 你们有没有茶吗？ → 你们有茶吗？ is correct Chinese, but not one of our accepted answers yet.
- **Explanations mostly in Chinese** (7 of 8 flagged), although the prompt asks for English, which an A2 learner needs.
- **Category labels often wrong**, e.g. an extra-很 error labelled "vocabulary".

**Caveat:** the tune split is tiny (10 sentences), so one sentence changes a score by 10 to 33 percentage points. Treat differences between versions with caution.

**Next changes (one per version):** (a) a stronger "don't change correct sentences" rule; (b) require English explanations; (c) a short list of common beginner mistakes.

## Answer-key changes

- **After v1 (2026-11-14):** added 你们有茶吗？ as a second right answer for 你们有没有茶吗？ (tune sentence 04). It is correct Chinese that v1 produced but our key didn't accept. This changes the answer key, not the model. Under the new key, v1's "corrections matching" would be 5/7 instead of 4/7; we left the v1 row as originally recorded.

## Repeat runs

- **2026-11-14, v1 run again** (files `20261114-110918_…_v1_tune.json`, `20261114-111144_…_v1_na.json`). This was meant to be the v2 run, but Colab's `git pull` was refused (local result files clashed with newly committed ones), so the old v1 prompt ran. The results were **identical** to the first v1 run on every sentence and every conversation turn, which confirms runs are repeatable at temperature 0. It is not a new version, so it has no row in the table. The notebook now downloads a fresh copy of the code each time and prints the prompt version, so this can't happen silently again.

## v2 notes

Same totals as v1, but on **different sentences**, so the rule moved errors around rather than removing them.
- **Fixed:** 我要一杯拿铁，不要糖。 is now left alone. 你们有没有茶吗？ → 你们有没有茶？ (exact match).
- **New over-correction:** 我明天再来这里喝咖啡。 → 我明天再来喝咖啡。, while its own explanation says the original is correct. 我要买单。 → 我买单。 still happens.
- **Got worse:** 我喝咖啡在家。 → 我要喝咖啡在家。 (v1 fixed this correctly).
- **Missed:** 我要一杯面包。 is no longer flagged at all. 我想吃一杯咖啡。 is flagged but fixed to 我想要一杯咖啡 instead of 喝.
- **Explanations:** all 8 are in Chinese (v1: 7 of 8), not the English an A2 learner needs.
- **Takeaway:** stronger wording alone doesn't stop a 3B model over-correcting. It sometimes says a sentence is correct and still "fixes" it.

## v3 notes

Code commit `d65e8dd`. Only the sentence-checker prompt changed: three worked examples of **correct** café sentences answered with no error and left unchanged (我们要结账。, 不要冰，谢谢。, 我们周末再来这家店吃饭。). None of them are quiz sentences, and a unit test checks this. The waiter prompt didn't change, so the conversation transcripts are identical to v2's.

- **Better:** no correct sentence was changed (0/3, down from 2/3). 我要买单。 and 我明天再来这里喝咖啡。 are now left alone.
- **Worse:** 我想吃一杯咖啡。 (吃 → 喝) is no longer flagged, so mistakes caught fell from 6/7 to 5/7. v2 had flagged it but with a wrong fix, so corrections matching stayed at 4/7.
- **Still wrong:** 我要一杯面包。 was called a mistake but returned unchanged, so it counts as no correction. 我喝咖啡在家。 was "fixed" to 我回家喝咖啡。, which changes the meaning.
- **Explanations:** all 5 in Chinese, not English.
- **Takeaway:** examples worked where a written rule didn't, but the model is now more cautious. Next: add worked examples of real word-choice and measure-word mistakes (not quiz sentences), keeping false corrections at 0/3; then fix the English explanations.

Raw files: `20261114-113909_corrections_Qwen_Qwen2.5-3B-Instruct_v3_tune.json`, `20261114-114114_conversation_Qwen_Qwen2.5-3B-Instruct_v3_na.json`. Run by Claude in Colab (sections 1, 2, 3 and 5; the test split was not run). The files were copied out of Colab as text and checked against the SHA-256 hashes Colab printed.

## v4 notes

Code commit `7323f8e`. Checker prompt only: two worked examples of real mistakes with English explanations (我想喝一块蛋糕 → 我想吃一块蛋糕; 我要两杯三明治 → 我要两个三明治). Neither is a quiz sentence (a unit test checks).
- **Better:** caught all 7 mistakes; 我要一杯面包 → 我要一块面包 and 我想吃一杯咖啡 → 我想喝一杯咖啡 now right. Corrections matching 6/7.
- **Worse:** over-correcting came back: 我要一杯拿铁，不要糖 → 不要加糖, and 我要买单 → 我要付钱 (2/3).
- **Explanations:** 4 of 9 in English (up from 0 of 5), probably because the new examples are in English. Some are wrong or confused.
- **Takeaway:** prompt examples alone swing between over-correcting (v4) and under-correcting (v3).

Raw files: `20261114-114903_…_v4_tune.json`, `20261114-115052_…_v4_na.json`.

## v5 notes

Code commits `aa0846d`. Change in `convo/review.py` and its prompt: when the checker flags a sentence, the model is asked a second yes/no question, "is this original sentence already correct, natural Chinese?". If it clearly says yes, the sentence is kept unchanged.
- **Better:** 我要一杯拿铁，不要糖 left alone again (false corrections 1/3).
- **Worse:** the second check said "it's fine" far too easily and threw away 3 real corrections (你们有没有茶吗, 我想吃一杯咖啡, 我希望获得一杯咖啡). Caught 4/7, matching 3/7: worse than v4.
- **Still wrong:** 我要买单 → 我要付钱.
- **Explanations:** 3 of 5 in English.

Raw files: `20261114-115733_…_v5_tune.json`, `20261114-115843_…_v5_na.json`.

## v6 notes

Code commits `6a4fe39`, `b42c88b`. The second check now shows the model **both versions side by side** (A = what the learner wrote, B = the proposed fix) and asks which is more correct and natural, answering A if they are equally good. The original is kept only if the model clearly picks A.
- **Best version on the tune split:** caught 7/7, corrections matching 6/7 (meets the 85% target), false corrections 1/3 (misses the 10% target). It keeps all of v4's catches and drops one of its two over-corrections.
- **Still wrong:** 我喝咖啡在家 → 我要喝咖啡在家 (no version has fixed this word-order mistake); 我要买单 → 我要付钱 (the side-by-side check accepts it because both sound fine to the model).
- **Explanations:** 4 of 8 in English; some still wrong, so they need human review.
- **Regression check:** `scripts/compare_versions.py` compares a version's tune results with every earlier version, sentence by sentence, using the raw files.
- **Recommended** as the candidate for the final test run.

Raw files: `20261114-120403_…_v6_tune.json`, `20261114-120513_…_v6_na.json`.

## Test-split runs

- **2026-11-14, v1 on the test split** (file `20261114-105738_…_v1_test.json`): the test split was run once during the first Colab run, before we had settled our rule of only running it at the end. Result: 19/21 mistakes flagged, 3/21 corrections matching (14%), 6/11 false corrections. We are not using these test results to choose prompt changes (all changes are based on the tune split only). The final test run will be reported alongside this one.

- **2026-11-14, v6 on the test split (final benchmark)** (file `20261114-131827_…_v6_test.json`, console log `20261114-131827_console_v6_test.txt`): run once with v6 unchanged. Result: 15/21 mistakes caught, 7/21 corrections matching (33%), 2/11 false corrections (18%), 32/32 valid. Compared with v1 on the same 32 sentences: matching 3/21 → 7/21, false corrections 6/11 → 2/11, caught 19/21 → 15/21. 5 of the 6 missed mistakes were flagged by the first check and then undone by the side-by-side second check. Targets (85% matching, at most 10% false corrections) not met. Rows for a Chinese speaker to mark: `20261114-131827_human_review_test_v6.csv`. These results are not used to choose any change; if the checker changes again, the test split is run again at the end and every run is reported.

## v7 notes (not evaluated yet)

2026-11-15. Added four scenarios next to the café: `shop`, `restaurant`, `interview` and `chat` (open conversation, where the character picks the topics). Everything scenario-specific moved into `convo/scenarios.py`: character, setting, flow, what to remember, surprises, the name of the state list (`order`, `basket`, `facts`), and where the checker is told the sentence was said. The checker's rules and worked examples are the same in every scenario.

- **Café unchanged:** every café prompt (system prompts for each level, difficulty and surprise, the checker, the second check and the assessment) is identical to v6; `tests/test_scenarios.py` checks this against `tests/golden_cafe_v6.json`. Café surprise sequences for a given seed are also unchanged. So the v6 café rows above still hold, and the café needs no re-run.
- **New scenarios: no scores yet.** Nothing has been run on Qwen for them. Each has three scripted conversations with a recall question in `convo/evaluation.py` (`SCENARIO_SCRIPTS`); run `python -m convo.evaluation conversation --scenario shop` (and `restaurant`, `interview`, `chat`) and add a row per scenario. Character consistency and context retention there need a person to read the transcripts too.
- **Checker in new scenarios:** the correction test set is café sentences, so correction accuracy and false corrections are only measured for the café.

## v9 notes (not evaluated yet)

2026-11-15. Restaurant only: the server sometimes opened with the customer's line (您好，请问有空位吗？). The restaurant prompt now says the server never asks the customer about free tables, dishes or prices and never speaks the customer's lines, and the opening cue asks for 您好，几位？. Café prompts are unchanged (golden test), so the v6 café scores still hold.

## v10 notes (live app only, not evaluated)

2026-11-15. New turn check (`convo/turn_check.py`): in the live app, each learner message is compared with the character's last line and sorted into answer / no answer / off-topic / not appropriate by a short extra model call. If it isn't an answer, the character gets a hidden one-off note for that reply (ask again and don't assume, or steer back politely), and the live feedback card warns the learner. Example that prompted it: the barista asked what the customer wanted, the learner only said "Ni hao", and the barista replied "hot or iced?" as if a drink had been ordered.

The check is off by default in `Conversation`, so the scored evaluation runs exactly as before; the café system prompts and the checker are unchanged (golden test). Unclear model answers count as "answer", so a shaky check doesn't interrupt normal conversations. Not yet measured: how often it misjudges a real answer.

## v11 notes (live app only, not evaluated)

2026-11-15. Turn check: the steer-back instruction now goes into the character's system prompt for that one reply (in v10 it was a note at the end of the learner's message, and the barista still followed an off-topic message twice: 那你平时喜欢做什么呢？ and 足球听起来很有趣，您喜欢哪个队？). It is also firmer: don't talk about the new topic, ask the last question again. No surprise is added on a steer-back turn. Café prompts and the checker are unchanged.

## v12 notes (live app only, not evaluated)

2026-11-15. Found in our own testing: a reply in English ("Thank you, I will leave now.") was treated as misspelt pinyin, "corrected" word by word (Thank → tang 糖, will → null ...) into nonsense characters (糖有，一唟略耨), and the turn check called it "not appropriate". v12 adds a rule-based English detector (common English words, and words that can't be read as pinyin; no model call). English replies now get no spelling, tone or grammar feedback, just "That's English … reply in Mandarin" and a "That wasn't in Mandarin" warning, and the character is told to answer in simple Chinese, encourage the learner to say it in Chinese and ask again. Also, "null" is no longer offered as a pinyin syllable. Café prompts and the checker are unchanged.
