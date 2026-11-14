# Convo AI: test data

**Recorded by Ethan**

This is the quiz we use to measure Convo. It is **test data, not training data**: we never train or fine-tune the model. We give Qwen 2.5 3B Instruct each learner sentence and check whether it corrects it properly.

- **Source file:** [`data/test_cases.csv`](data/test_cases.csv). This page is generated from it, so the two always match.
- **Scenario:** an A2-level immigrant ordering at a café, in Mandarin Chinese (simplified characters).
- **How we made it:** our team wrote the sentences with help from Claude (an AI assistant), based on common beginner mistakes, then revised them after review (we removed sentences that are natural in real speech, and added extra right answers where more than one is correct).
- **Checked by a Chinese speaker:** 42 of 42 sentences. 

## Summary

| | Count |
|---|---|
| Total sentences | 42 |
| With a mistake | 28 |
| Already correct (Convo should leave these alone) | 14 |
| Tune split (used to improve the prompt) | 10 |
| Test split (held out, used once for the final score) | 32 |

**Mistake types:** word_order (7), extra_word (6), measure_word (4), question_structure (4), missing_particle (2), unnatural (2), negation (1), other (1), vocabulary (1).

## How it is scored

- **Mistakes caught:** of the sentences with a mistake, how many Convo flags.
- **False corrections:** of the correct sentences, how many Convo wrongly "fixes".
- **Corrections matching:** how many of Convo's corrections match one of our right answers. This is strict, so a correct answer worded differently counts as a miss; a person also reviews the corrections by hand.
- **Baseline:** a waiter that never corrects anything (catches 0 mistakes, 0 false corrections).
- **Fairness:** we only improved the prompt using the **tune** split. The **test** split is run once, at the end, and the prompt is not changed after that.

Version-by-version scores on the tune split are in [`results/VERSIONS.md`](results/VERSIONS.md). Raw outputs for every run are in [`results/`](results/).

## Results by version

(Copied from [`results/VERSIONS.md`](results/VERSIONS.md).)

Model: Qwen/Qwen2.5-3B-Instruct, temperature 0 (runs are repeatable). Run in Google Colab on a T4 GPU.
Scores are on the **tune** split only (10 sentences: 7 with a mistake, 3 correct). The test split is run once, at the end.
Never delete or edit old rows; add a new row per version.

| Version | Date | What changed and why | Mistakes caught | Corrections matching | False corrections | Character consistency | Context retained |
|---|---|---|---|---|---|---|---|
| Baseline | n/a | Waiter that never corrects anything | 0/7 | n/a | 0/3 | n/a | n/a |
| v1 | 2026-11-14 | First prompt | 6/7 | 4/7 (57%) | 2/3 (67%) | 30/30 | 6/6 |
| v2 | 2026-11-14 | Stronger rule: don't change sentences that are already correct (v1 wrongly fixed 2 of 3) | 6/7 | 4/7 (57%) | 2/3 (67%) | 30/30 | 6/6 |

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

## Test-split runs

- **2026-11-14, v1 on the test split** (file `20261114-105738_…_v1_test.json`): the test split was run once during the first Colab run, before we had settled our rule of only running it at the end. Result: 19/21 mistakes flagged, 3/21 corrections matching (14%), 6/11 false corrections. We are not using these test results to choose prompt changes (all changes are based on the tune split only). The final test run will be reported alongside this one.


## Sentences with a mistake (28)

| ID | Split | Learner says | Right answer(s) | Type | Meaning | Why |
|---|---|---|---|---|---|---|
| 01 | tune | 我要一杯面包。 | 我要一个面包。 / 我要一块面包。 | measure_word | I'd like a piece of bread. | Bread is counted with 个 or 块 (piece), not 杯 (cup), which is for drinks. |
| 02 | test | 我是很饿。 | 我很饿。 | extra_word | I'm very hungry. | With an adjective like 饿, you don't need 是: say 我很饿. |
| 03 | test | 我想喝咖啡热。 | 我想喝热咖啡。 | word_order | I'd like a hot coffee. | The adjective goes before the noun: 热咖啡. |
| 04 | tune | 你们有没有茶吗？ | 你们有没有茶？ / 你们有茶吗？ | question_structure | Do you have tea? | A 有没有 question already asks yes/no, so 吗 is not added. |
| 05 | test | 我昨天不喝咖啡。 | 我昨天没喝咖啡。 | negation | I didn't drink coffee yesterday. | Use 没 to negate something that did not happen in the past. |
| 06 | test | 我要两杯水和一杯蛋糕。 | 我要两杯水和一块蛋糕。 / 我要两杯水和一个蛋糕。 / 我要两杯水和一份蛋糕。 | measure_word | I'd like two glasses of water and a piece of cake. | Cake is counted with 块 (piece), not 杯 (cup). |
| 07 | test | 这个咖啡多少钱吗？ | 这个咖啡多少钱？ | question_structure | How much is this coffee? | 多少钱 is already a question word, so 吗 is not added. |
| 08 | tune | 我喝咖啡在家。 | 我在家喝咖啡。 | word_order | I drink coffee at home. | The place (在家) goes before the verb: 在家喝咖啡. |
| 09 | test | 我喜欢喝很咖啡。 | 我很喜欢喝咖啡。 | word_order | I really like drinking coffee. | 很 goes before the verb 喜欢, not before the noun. |
| 10 | test | 我们两个人要一桌子。 | 我们两个人要一张桌子。 | measure_word | There are two of us and we'd like a table. | Tables use the measure word 张. |
| 11 | test | 可以我用卡付钱吗？ | 我可以用卡付钱吗？ | word_order | Can I pay by card? | The subject 我 comes before 可以. |
| 12 | tune | 这个蛋糕太很甜了。 | 这个蛋糕太甜了。 | extra_word | This cake is too sweet. | 太 and 很 are both degree words; use only one. |
| 13 | test | 我不要放糖在咖啡。 | 咖啡里不要放糖。 / 请不要在咖啡里放糖。 / 我的咖啡不要放糖。 | word_order | Please don't put sugar in the coffee. | Say where first: 咖啡里 (in the coffee), then 不要放糖. |
| 14 | test | 我要一个杯茶。 | 我要一杯茶。 | measure_word | I'd like a cup of tea. | 杯 is already the measure word; 个 is not added before it. |
| 15 | test | 他要也一杯咖啡。 | 他也要一杯咖啡。 | word_order | He also wants a coffee. | 也 goes before the verb: 他也要. |
| 16 | tune | 我没有钱现金。 | 我没有现金。 | extra_word | I don't have any cash. | 现金 already means cash, so 钱 is not needed. |
| 18 | test | 我不会说中文很好。 | 我中文说得不好。 / 我中文说得不太好。 | other | I don't speak Chinese well. | Use 得 to say how well you do something: 中文说得不好. |
| 19 | test | 我想要的一杯水。 | 我想要一杯水。 | extra_word | I'd like a glass of water. | Don't add 的 between 想要 and the thing you want. |
| 20 | test | 我们的菜还没来了。 | 我们的菜还没来。 | extra_word | Our food hasn't arrived yet. | 还没 already means 'not yet', so 了 is not added. |
| 21 | test | 我每天喝咖啡两杯。 | 我每天喝两杯咖啡。 | word_order | I drink two cups of coffee every day. | The number and measure word go before the noun: 喝两杯咖啡. |
| 22 | test | 这里的咖啡比那里很好喝。 | 这里的咖啡比那里好喝。 | extra_word | The coffee here is better than there. | In a 比 sentence do not use 很 before the adjective. |
| 23 | test | 请问，厕所在哪里吗？ | 请问，厕所在哪里？ | question_structure | Excuse me, where is the toilet? | 哪里 is already a question word, so 吗 is not added. |
| 36 | tune | 我想吃一杯咖啡。 | 我想喝一杯咖啡。 | vocabulary | I'd like to drink a cup of coffee. | Use 喝 (drink) for drinks; 吃 (eat) is for food. |
| 37 | test | 这是我朋友咖啡。 | 这是我朋友的咖啡。 | missing_particle | This is my friend's coffee. | Use 的 to show possession. |
| 38 | test | 我已经点咖啡。 | 我已经点咖啡了。 / 我已经点了咖啡。 | missing_particle | I've already ordered coffee. | 已经 normally goes with 了 to show the action is completed. |
| 39 | test | 你想喝什么咖啡还是茶？ | 你想喝咖啡还是茶？ | question_structure | Would you like coffee or tea? | 什么 and 还是 do not go together; use 还是 alone to offer a choice. |
| 40 | tune | 我希望获得一杯咖啡。 | 我想要一杯咖啡。 / 我要一杯咖啡。 | unnatural | I'd like a coffee. | Grammatically fine, but 希望获得 sounds like formal writing. In a café say 我想要 or 我要. |
| 41 | test | 我可以请求你给我菜单吗？ | 我可以看一下菜单吗？ / 可以给我看一下菜单吗？ | unnatural | Could I see the menu? | Grammatically fine, but 请求 is very formal. 我可以看一下菜单吗？ is what people say. |

## Correct sentences (14)

| ID | Split | Learner says | Right answer(s) | Type | Meaning | Why |
|---|---|---|---|---|---|---|
| 24 | tune | 我要一杯拿铁，不要糖。 | 我要一杯拿铁，不要糖。 | none | I'd like a latte, no sugar. | Correct. |
| 25 | test | 请给我菜单。 | 请给我菜单。 | none | Please give me the menu. | Correct. |
| 26 | test | 我在这里吃，不带走。 | 我在这里吃，不带走。 | none | I'm eating here, not taking it away. | Correct. |
| 27 | tune | 我要买单。 | 我要买单。 | none | I'd like the bill. | Correct. |
| 28 | test | 我要一杯大的冰美式。 | 我要一杯大的冰美式。 | none | I'd like a large iced americano. | Correct. |
| 29 | test | 我两点来这里。 | 我两点来这里。 | none | I'll come here at two o'clock. | Correct. |
| 30 | test | 你们几点关门？ | 你们几点关门？ | none | What time do you close? | Correct. |
| 31 | test | 我想坐在窗户旁边。 | 我想坐在窗户旁边。 | none | I'd like to sit next to the window. | Correct. |
| 32 | test | 谢谢，咖啡来得很快。 | 谢谢，咖啡来得很快。 | none | Thanks, the coffee came quickly. | Correct. |
| 33 | tune | 我明天再来这里喝咖啡。 | 我明天再来这里喝咖啡。 | none | I'll come back here for coffee tomorrow. | Correct. |
| 34 | test | 这里的咖啡比那里好喝多了。 | 这里的咖啡比那里好喝多了。 | none | The coffee here is much better than there. | Correct. |
| 35 | test | 我可以用卡付钱吗？ | 我可以用卡付钱吗？ | none | Can I pay by card? | Correct. |
| 42 | test | 你们有牛奶吗？ | 你们有牛奶吗？ | none | Do you have milk? | Correct. |
| 43 | test | 一杯热茶，谢谢。 | 一杯热茶，谢谢。 | none | One hot tea, thank you. | Correct. |
