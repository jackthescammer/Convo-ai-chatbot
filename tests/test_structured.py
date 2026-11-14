import unittest

from convo.structured import extract_json, normalise, validate_review, validate_turn


class ExtractJson(unittest.TestCase):
    def test_plain(self):
        self.assertEqual(extract_json('{"a": 1}'), {"a": 1})

    def test_fenced_with_chatter(self):
        self.assertEqual(extract_json('Sure!\n```json\n{"a": "你好"}\n```\nDone'), {"a": "你好"})

    def test_prefix_text(self):
        self.assertEqual(extract_json('回复 {"a": {"b": 2}} end'), {"a": {"b": 2}})

    def test_garbage_and_empty(self):
        self.assertIsNone(extract_json("no json here"))
        self.assertIsNone(extract_json(""))
        self.assertIsNone(extract_json('{"a": '))


class NormaliseTest(unittest.TestCase):
    def test_ignores_punctuation_and_space(self):
        self.assertEqual(normalise("我要 一杯咖啡。"), normalise("我要一杯咖啡！"))


class ValidateTurn(unittest.TestCase):
    def ok(self, **kw):
        base = {"reply": "您想喝什么？", "english": "What would you like?",
                "state": {"stage": "ordering", "order": ["拿铁"]}}
        base.update(kw)
        return validate_turn(base, "greeting", [])

    def test_good(self):
        p, problems = self.ok()
        self.assertEqual(problems, [])
        self.assertEqual((p.stage, p.order), ("ordering", ["拿铁"]))

    def test_rejects_english_reply(self):
        self.assertIsNone(self.ok(reply="What would you like?")[0])

    def test_rejects_pinyin_mixed_in(self):
        self.assertIsNone(self.ok(reply="nǐ hǎo, huānyíng guānglín 欢迎")[0])

    def test_rejects_meta(self):
        p, problems = self.ok(reply="作为AI，我不能喝咖啡。")
        self.assertIsNone(p)
        self.assertTrue(any("character" in x for x in problems))

    def test_rejects_too_long(self):
        self.assertIsNone(self.ok(reply="好" * 200)[0])

    def test_bad_state_falls_back_to_previous(self):
        p, _ = validate_turn({"reply": "好的。", "state": {"stage": "banana", "order": "x"}},
                             "payment", ["茶"])
        self.assertEqual((p.stage, p.order), ("payment", ["茶"]))

    def test_non_dict(self):
        self.assertIsNone(validate_turn(None)[0])
        self.assertIsNone(validate_turn({"english": "x"})[0])


class ValidateReview(unittest.TestCase):
    def test_real_correction(self):
        p, problems = validate_review(
            {"has_error": True, "corrected": "我要一杯咖啡。", "category": "measure_word",
             "explanation": "Use 杯.", "english": "A coffee."}, "我要一个咖啡。")
        self.assertEqual(problems, [])
        self.assertTrue(p.has_error)
        self.assertEqual(p.category, "measure_word")

    def test_no_change_is_not_a_correction(self):
        p, _ = validate_review({"has_error": True, "corrected": "我要买单！", "category": "other",
                                "explanation": "x"}, "我要买单。")
        self.assertFalse(p.has_error)
        self.assertEqual(p.guard, "no_change")
        self.assertEqual(p.corrected, "我要买单。")

    def test_no_error_keeps_original(self):
        p, _ = validate_review({"has_error": False, "corrected": "something else"}, "我要买单。")
        self.assertEqual((p.has_error, p.corrected, p.category), (False, "我要买单。", "none"))

    def test_string_booleans_accepted(self):
        p, _ = validate_review({"has_error": "false", "corrected": "好"}, "好")
        self.assertFalse(p.has_error)

    def test_missing_explanation_rejected(self):
        self.assertIsNone(validate_review({"has_error": True, "corrected": "我要一杯茶。"}, "我要一个茶。")[0])

    def test_unknown_category_becomes_other(self):
        p, _ = validate_review({"has_error": True, "corrected": "我要一杯茶。", "category": "magic",
                                "explanation": "x"}, "我要一个茶。")
        self.assertEqual(p.category, "other")

    def test_bad_has_error(self):
        self.assertIsNone(validate_review({"has_error": "maybe", "corrected": "好"}, "好")[0])


if __name__ == "__main__":
    unittest.main()
