# final: v6 on the TEST split (benchmark)

- **Version:** v6 (`PROMPT_VERSION = "v6"`), unchanged; no code or prompt edits before the run
- **Code:** Colab clone at commit `c8e0600`. `convo/`, `data/`, `scripts/` and `app.py` are identical to `main` at the time of the run (`d620704`).
- **Date:** 2026-11-14, 23:18 Brisbane (`20261114-131827` UTC)
- **Model:** Qwen/Qwen2.5-3B-Instruct, temperature 0, Google Colab T4 GPU
- **Command:** `python -m convo.evaluation corrections --split test`, run once from the Colab terminal
- **Run by:** Claude, in the team's Colab
- **Test split:** 32 sentences: 21 with a mistake, 11 correct. These are the same 32 sentences and answer keys as the v1 early run (checked id by id).

## Scores (test split)

| | Baseline (never corrects) | v1 early test run | **v6 (final)** |
|---|---|---|---|
| Mistakes caught | 0/21 | 19/21 | **15/21 (71%)** |
| Corrections matching | 0/21 | 3/21 | **7/21 (33%)** |
| False corrections | 0/11 | 6/11 | **2/11 (18%)** |
| Valid output | n/a | 32/32 | **32/32 (100%)** |

- The baseline is the "do nothing" checker that `convo/evaluation.py` reports (`baseline_mistakes_caught: 0`, `baseline_false_corrections: 0`). It never changes a sentence.
- v1 early test run: `20261114-105738_corrections_Qwen_Qwen2.5-3B-Instruct_v1_test.json`.
- Targets from CLAUDE.md: correction accuracy at least 85% (**not met**, 33%) and false-correction rate at most 10% (**not met**, 18%).
- For context only, v6 on the tune split was 7/7 caught, 6/7 matching and 1/3 false. The test scores are much lower, so the tune gains carry over only partly to sentences the prompts were not tuned on.

### By mistake type (v6, test)

| Type | Sentences | Caught | Matching |
|---|---|---|---|
| measure_word | 3 | 3 | 3 |
| word_order | 6 | 5 | 2 |
| extra_word | 4 | 3 | 2 |
| question_structure | 3 | 1 | 0 |
| missing_particle | 2 | 1 | 0 |
| negation | 1 | 0 | 0 |
| unnatural | 1 | 1 | 0 |
| other | 1 | 1 | 0 |

## Failure examples (learner → v6's fix → expected)

| ID | Type | Learner | v6 fix | Expected |
|---|---|---|---|---|
| 05 | negation | 我昨天不喝咖啡。 | (no change) | 我昨天没喝咖啡。 |
| 38 | missing_particle | 我已经点咖啡。 | (no change) | 我已经点咖啡了。 / 我已经点了咖啡。 |
| 37 | missing_particle | 这是我朋友咖啡。 | 这是我的朋友的咖啡。 | 这是我朋友的咖啡。 |
| 18 | other | 我不会说中文很好。 | 我不會說中文很好。 (switched to traditional characters, error still there) | 我中文说得不好。 / 我中文说得不太好。 |
| 32 | correct sentence | 谢谢，咖啡来得很快。 | 谢谢，咖啡快来了。 (false correction, changes the meaning) | (no change) |

Facts from the raw file:
- 5 of the 6 missed mistakes (05, 07, 20, 38, 39) were flagged by the first check, then reverted by the A/B second check (`guard: verified_correct`).
- The other missed mistake (09) was a `no_change` guard.
- The 2 false corrections are 28 and 32.

**These test results must not be used to choose the next change. Changes are based on the tune split only.**

## Raw files (all new, nothing overwritten)

- `results/20261114-131827_corrections_Qwen_Qwen2.5-3B-Instruct_v6_test.json`: every sentence, v6's fix, guard and metrics
- `results/20261114-131827_human_review_test_v6.csv`: v6 test rows for a Chinese speaker to mark. It is saved under a new name so the v1 `results/human_review_test.csv` is not overwritten.
- `results/20261114-131827_console_v6_test.txt`: console output of the run
- `results/log.csv`: one row appended (`20261114-131827, corrections, v6, test`)

## Rules from now on

- Never use test results to decide what to change next; tune split only.
- If the checker changes after this (`convo/prompts.py` or `convo/review.py`), the test split is run again at the very end, and every test run is reported.
