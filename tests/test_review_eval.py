import csv
import json
import tempfile
import unittest
from pathlib import Path

from convo import Settings
from convo.evaluation import (CONVERSATION_SCRIPTS, export_for_human_review, load_cases, log_result,
                              run_conversation_eval, run_correction_eval, summarise_human_review)
from convo.prompts import CATEGORIES, PROMPT_VERSION, build_review_prompt
from convo.structured import normalise
from convo.render import format_turn
from convo.review import build_report, review_sentence
from fakes import FakeBackend, review_json, turn_json

FAKE_PINYIN = lambda s: "PY:" + s


def read_csv(path):
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


class Render(unittest.TestCase):
    def test_display_combinations(self):
        both = format_turn("你好", "Hello", ("chinese", "pinyin", "english"), FAKE_PINYIN)
        self.assertIn("你好", both)
        self.assertIn("*PY:你好*", both)
        self.assertIn("> Hello", both)
        only_py = format_turn("你好", "Hello", ("pinyin",), FAKE_PINYIN)
        self.assertNotIn("Hello", only_py)
        self.assertEqual(only_py, "*PY:你好*")

    def test_never_empty(self):
        self.assertEqual(format_turn("你好", "", ("english",), FAKE_PINYIN), "你好")


class ReviewTest(unittest.TestCase):
    def test_retry_then_ok(self):
        answers = iter(["nonsense", review_json(True, "我要一杯茶。", "measure_word", "Use 杯.", "A tea."),
                        '{"better": "B"}'])
        r = review_sentence(FakeBackend(lambda m: next(answers)), "我要一个茶。")
        self.assertTrue(r.valid and r.has_error)

    def verify_backend(self, verdict):
        def handler(messages):
            if messages[0]["content"].startswith("You are a native Mandarin speaker"):
                return verdict
            return review_json(True, "我要付钱。", "vocabulary", "Use 付钱.", "I want to pay.")
        return FakeBackend(handler)

    def test_verify_step_keeps_sentence_judged_correct(self):
        r = review_sentence(self.verify_backend('{"better": "A"}'), "我要买单。")
        self.assertFalse(r.has_error)
        self.assertEqual((r.corrected, r.guard), ("我要买单。", "verified_correct"))

    def test_verify_step_keeps_correction_when_judged_wrong_or_unclear(self):
        for verdict in ('{"better": "B"}', "not sure", '{"correct": true}'):
            r = review_sentence(self.verify_backend(verdict), "我要买单。")
            self.assertTrue(r.has_error, verdict)

    def test_verify_step_sees_both_versions(self):
        backend = self.verify_backend('{"better": "B"}')
        review_sentence(backend, "我要买单。")
        self.assertEqual(backend.calls[-1][1]["content"], "A: 我要买单。\nB: 我要付钱。")

    def test_verify_step_not_called_when_no_error(self):
        backend = FakeBackend(lambda m: review_json(False, "我要买单。"))
        review_sentence(backend, "我要买单。")
        self.assertEqual(len(backend.calls), 1)

    def test_unusable_answer_marked_invalid(self):
        r = review_sentence(FakeBackend(lambda m: "no idea"), "我要一个茶。")
        self.assertFalse(r.valid)
        self.assertFalse(r.has_error)

    def test_report_sections_and_counts(self):
        table = {
            "我要一个咖啡。": review_json(True, "我要一杯咖啡。", "measure_word", "Use 杯.", "A coffee."),
            "我要一个茶。": review_json(True, "我要一杯茶。", "measure_word", "Use 杯.", "A tea."),
            "我想吃咖啡。": review_json(True, "我想喝咖啡。", "vocabulary", "Use 喝.", "Drink coffee."),
            "我要买单。": review_json(False, "我要买单。", "none", "", "The bill."),
        }

        def handler(messages):
            if messages[0]["content"].startswith("You write short"):
                return json.dumps({"assessment": "You did well ordering drinks. Practise measure words."})
            return table[messages[1]["content"]]

        backend = FakeBackend(handler, verify='{"better": "B"}')
        report = build_report(backend, list(table) + ["thanks", "  "], Settings(), pinyin_fn=FAKE_PINYIN)
        self.assertEqual(report.skipped, 2)
        self.assertEqual(report.recurring, [("measure_word", 2)])
        self.assertEqual(len(report.suggestions), 2)  # measure_word + vocabulary tips
        md = report.to_markdown()
        for needle in ("Grammar corrections", "Vocabulary improvements", "Already correct",
                       "Recurring weaknesses", "PY:我要一杯咖啡。", "Practise measure words", "can be wrong"):
            self.assertIn(needle, md)
        self.assertNotIn("More natural expressions", md)

    def test_assessment_falls_back_when_model_is_unusable(self):
        def handler(messages):
            if messages[0]["content"].startswith("You write short"):
                return "garbage"
            return review_json(False, "好的。", "none", "", "OK.")
        report = build_report(FakeBackend(handler), ["好的。"], Settings(), pinyin_fn=FAKE_PINYIN)
        self.assertIn("correct", report.assessment)

    def test_no_chinese_gives_friendly_report(self):
        report = build_report(FakeBackend(lambda m: ""), ["hello", "ok"], Settings(), pinyin_fn=FAKE_PINYIN)
        self.assertIn("nothing to review", report.to_markdown())


class ReviewPromptTest(unittest.TestCase):
    def test_review_prompt_keeps_correct_sentences_unchanged(self):
        p = build_review_prompt("A2")
        for needle in ("Assume the sentence is correct", "When in doubt", "Never add, remove or swap",
                       "has_error false", "changing as little as possible"):
            self.assertIn(needle, p)
        self.assertRegex(PROMPT_VERSION, r"^v\d+$")

    def test_review_prompt_examples_are_not_quiz_sentences(self):
        import re
        p = build_review_prompt("A2")
        examples = re.findall(r"Sentence: (.+)", p)
        self.assertGreaterEqual(len(examples), 5)
        quiz = {normalise(c["learner"]) for c in load_cases()} | {
            normalise(a) for c in load_cases() for a in c["accepted"]}
        for e in examples:
            self.assertNotIn(normalise(e), quiz, e)


class DatasetTest(unittest.TestCase):
    def test_dataset_is_sound(self):
        cases = load_cases()
        self.assertTrue(30 <= len(cases) <= 50)
        self.assertEqual(len({c["id"] for c in cases}), len(cases))
        required = ["learner", "correct", "category", "intended_meaning", "explanation", "split"]
        for c in cases:
            for k in required:
                self.assertTrue(c[k].strip(), (c["id"], k))
            self.assertEqual(c["has_mistake"], c["category"] != "none", c["id"])
            self.assertIn(c["category"], CATEGORIES + ("none",), c["id"])
        for needed in ("word_order", "measure_word", "missing_particle", "vocabulary",
                       "question_structure", "unnatural", "none"):
            self.assertIn(needed, {c["category"] for c in cases})

    def test_multiple_answers_are_well_formed(self):
        multi = [c for c in load_cases() if len(c["accepted"]) > 1]
        self.assertGreaterEqual(len(multi), 4)
        for c in multi:
            self.assertEqual(c["accepted"][0], c["correct"])
            self.assertEqual(len(set(c["accepted"])), len(c["accepted"]), c["id"])
            self.assertNotIn(c["learner"], c["accepted"], c["id"])  # a "fix" must change something
        for c in load_cases():
            if not c["has_mistake"]:
                self.assertEqual(c["accepted"], [c["learner"]], c["id"])

    def test_removed_and_updated_sentences(self):
        learners = {c["learner"] for c in load_cases()}
        self.assertNotIn("我要一个咖啡。", learners)      # natural in real speech
        self.assertNotIn("咖啡很好喝了。", learners)
        self.assertNotIn("这里的咖啡比那里好喝很多。", learners)
        self.assertIn("这里的咖啡比那里好喝多了。", learners)

    def test_splits(self):
        tune, test = load_cases(split="tune"), load_cases(split="test")
        self.assertEqual(len(tune) + len(test), len(load_cases()))
        self.assertFalse({c["id"] for c in tune} & {c["id"] for c in test})
        for part in (tune, test):
            self.assertTrue(any(c["has_mistake"] for c in part))
            self.assertTrue(any(not c["has_mistake"] for c in part))


class CorrectionEvalTest(unittest.TestCase):
    def setUp(self):
        self.cases = [
            {"id": "1", "learner": "我要一个茶。", "correct": "我要一杯茶。", "category": "measure_word", "has_mistake": True},
            {"id": "2", "learner": "我喝咖啡在家。", "correct": "我在家喝咖啡。", "category": "word_order", "has_mistake": True},
            {"id": "3", "learner": "我要买单。", "correct": "我要买单。", "category": "none", "has_mistake": False},
            {"id": "4", "learner": "请给我菜单。", "correct": "请给我菜单。", "category": "none", "has_mistake": False},
        ]

    def test_metrics(self):
        answers = {
            "我要一个茶。": review_json(True, "我要一杯茶！", "measure_word", "Use 杯."),          # exact (punctuation ignored)
            "我喝咖啡在家。": review_json(False, "我喝咖啡在家。"),                              # missed
            "我要买单。": review_json(True, "我想买单。", "other", "Changed it."),                # false correction
            "请给我菜单。": review_json(False, "请给我菜单。"),
        }
        res = run_correction_eval(FakeBackend(lambda m: answers[m[1]["content"]], verify='{"better": "B"}'), self.cases)
        m = res["metrics"]
        self.assertEqual((m["n_mistake_cases"], m["n_correct_cases"]), (2, 2))
        self.assertEqual(m["detection_recall"], 0.5)
        self.assertEqual(m["correction_accuracy_strict"], 0.5)
        self.assertEqual(m["false_correction_rate"], 0.5)
        self.assertEqual(m["valid_output_rate"], 1.0)
        self.assertEqual(m["baseline_mistakes_caught"], 0)
        self.assertEqual(m["by_category"]["measure_word"]["exact"], 1)

    def test_any_accepted_answer_counts(self):
        case = {"id": "9", "learner": "我中文说不好。", "correct": "我中文说得不好。", "category": "other",
                "has_mistake": True, "accepted": ["我中文说得不好。", "我中文说得不太好。"]}
        for fix, expected in [("我中文说得不太好。", True), ("我中文说得不好！", True), ("我说中文很好。", False)]:
            res = run_correction_eval(FakeBackend(lambda m, f=fix: review_json(True, f, "other", "why")), [case])
            self.assertEqual(res["rows"][0]["fix_exact"], expected, fix)
        self.assertEqual(res["rows"][0]["expected"], "我中文说得不好。 | 我中文说得不太好。")

    def test_invalid_outputs_reduce_valid_rate(self):
        res = run_correction_eval(FakeBackend(lambda m: "no json"), self.cases)
        self.assertEqual(res["metrics"]["valid_output_rate"], 0.0)
        self.assertEqual(res["metrics"]["detection_recall"], 0.0)

    def test_human_review_roundtrip_and_logging(self):
        answers = {c["learner"]: review_json(True, c["correct"] + "x", "other", "why") for c in self.cases}
        res = run_correction_eval(FakeBackend(lambda m: answers[m[1]["content"]], verify='{"better": "B"}'), self.cases)
        with tempfile.TemporaryDirectory() as d:
            path = export_for_human_review(res, Path(d) / "sub" / "review.csv")
            rows = read_csv(path)
            self.assertEqual(len(rows), 4)
            for r, mark in zip(rows, ["y", "y", "n", ""]):
                r["human_correction_ok"], r["human_explanation_ok"] = mark, "y" if mark else ""
            with open(path, "w", newline="", encoding="utf-8") as f:
                w = csv.DictWriter(f, rows[0].keys())
                w.writeheader()
                w.writerows(rows)
            s = summarise_human_review(path)
            self.assertEqual((s["corrections_marked"], s["corrections_ok"]), (3, 2))
            self.assertEqual(s["explanation_accuracy_human"], 1.0)
            self.assertEqual(s["unmarked"], 1)

            out = log_result("corrections", "org/model", "tune", res, results_dir=d)
            self.assertTrue(out.exists())
            log = read_csv(Path(d) / "log.csv")
            self.assertEqual((log[0]["model"], log[0]["prompt_version"]), ("org/model", PROMPT_VERSION))
            log_result("corrections", "org/model", "test", res, results_dir=d)
            self.assertEqual(len(read_csv(Path(d) / "log.csv")), 2)


class ConversationEvalTest(unittest.TestCase):
    def test_good_waiter_scores_full_marks(self):
        def handler(messages):
            seen = " ".join(m["content"] for m in messages if m["role"] == "user")
            items = [i for s in CONVERSATION_SCRIPTS for i in s["items"] if i in seen]
            order = sorted(set(items), key=items.index)
            return turn_json("您点了" + "和".join(order) + "。", "You ordered.", "ordering", order)
        res = run_conversation_eval(FakeBackend(handler))
        m = res["metrics"]
        self.assertEqual(m["context_retention"], 1.0)
        self.assertEqual(m["character_consistency"], 1.0)

    def test_forgetful_waiter_fails_retention(self):
        res = run_conversation_eval(FakeBackend(lambda m: turn_json("好的。", "OK.", "ordering", [])))
        self.assertEqual(res["metrics"]["context_retention"], 0.0)
        self.assertEqual(res["metrics"]["character_consistency"], 1.0)

    def test_broken_waiter_fails_consistency(self):
        res = run_conversation_eval(FakeBackend(lambda m: "As an AI, I cannot."))
        self.assertEqual(res["metrics"]["character_consistency"], 0.0)


if __name__ == "__main__":
    unittest.main()
