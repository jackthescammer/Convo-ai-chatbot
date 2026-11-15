"""Live per-message feedback (app.check_message): same checker, pinyin read as characters first."""

import unittest

from app import check_message
from fakes import FakeBackend, review_json

FAKE_PY = lambda s: "PY:" + s


class FakePinyin:
    def candidates(self, text, n=5):
        return ({"wo yao yi ge kafei": ["我要一个咖啡"], "ni hao": ["你好"]}.get(text, []),
                "" if text in ("wo yao yi ge kafei", "ni hao") else text)


class CheckMessage(unittest.TestCase):
    def test_characters_with_a_mistake(self):
        b = FakeBackend(lambda m: review_json(True, "我要一杯咖啡。", "measure_word", "Use 杯.", "A coffee."),
                        verify='{"better": "B"}')
        out = check_message(b, None, "我要一个咖啡。", "A2", pinyin_fn=FAKE_PY)
        self.assertTrue(out["has_error"])
        self.assertEqual(out["corrected"], "我要一杯咖啡。")
        self.assertEqual(out["corrected_pinyin"], "PY:我要一杯咖啡。")
        self.assertFalse(out["from_pinyin"])
        self.assertEqual(out["label"], "measure words")

    def test_pinyin_is_read_as_characters_then_checked(self):
        b = FakeBackend(lambda m: review_json(False, "你好", "none", "", "Hello."))
        out = check_message(b, FakePinyin(), "ni hao", "A1", pinyin_fn=FAKE_PY)
        self.assertTrue(out["from_pinyin"])
        self.assertEqual(out["checked"], "你好")
        self.assertEqual(out["checked_pinyin"], "PY:你好")
        self.assertFalse(out["has_error"])
        self.assertEqual(b.calls[0][-1]["content"], "你好")  # the checker saw characters, not pinyin

    def test_not_pinyin_is_skipped_without_calling_the_model(self):
        b = FakeBackend(lambda m: self.fail("model should not be called"))
        out = check_message(b, FakePinyin(), "hello there", "A2")
        self.assertTrue(out["skipped"])
        self.assertEqual(b.calls, [])

    def test_no_pinyin_converter_and_no_characters(self):
        out = check_message(FakeBackend(lambda m: ""), None, "ni hao", "A2")
        self.assertTrue(out["skipped"])


if __name__ == "__main__":
    unittest.main()
