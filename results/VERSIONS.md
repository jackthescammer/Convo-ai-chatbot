# Version history

Model: Qwen/Qwen2.5-3B-Instruct, temperature 0 (runs are repeatable). Run in Google Colab on a T4 GPU.
Scores are on the **tune** split only (10 sentences: 7 with a mistake, 3 correct). The test split is run once, at the end.
Never delete or edit old rows; add a new row per version.

| Version | Date | What changed and why | Mistakes caught | Corrections matching | False corrections | Character consistency | Context retained |
|---|---|---|---|---|---|---|---|
| Baseline | n/a | Waiter that never corrects anything | 0/7 | n/a | 0/3 | n/a | n/a |
| v1 | 2026-11-14 | First prompt | 6/7 | 4/7 (57%) | 2/3 (67%) | 30/30 | 6/6 |

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
