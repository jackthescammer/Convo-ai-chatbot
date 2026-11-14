import json
import unittest

from convo import Settings
from convo.chat import FALLBACK_REPLY, Conversation
from convo.prompts import SURPRISES, build_system_prompt
from fakes import FakeBackend, turn_json


class PromptTest(unittest.TestCase):
    def test_settings_change_the_prompt(self):
        a1 = build_system_prompt(Settings(level="A1", difficulty="Easy"))
        a2 = build_system_prompt(Settings(level="A2", difficulty="Challenging"))
        self.assertIn("HSK 1 words", a1)
        self.assertIn("A2", a2)
        self.assertNotEqual(a1, a2)
        self.assertIn("yes/no", a1)
        self.assertIn("busy café worker", a2)

    def test_prompt_defines_character_and_format(self):
        p = build_system_prompt(Settings())
        for needle in ("小林", "café", "Simplified Chinese", "not a teacher", "JSON", "order"):
            self.assertIn(needle, p)

    def test_surprise_only_when_given(self):
        self.assertNotIn("unexpected", build_system_prompt(Settings()))
        self.assertIn("unexpected", build_system_prompt(Settings(), surprise=SURPRISES[0]))

    def test_settings_validation(self):
        with self.assertRaises(ValueError):
            Settings(level="B2")
        with self.assertRaises(ValueError):
            Settings(display=())
        with self.assertRaises(ValueError):
            Settings(display=("klingon",))
        self.assertEqual(Settings(display=("english", "chinese")).display, ("chinese", "english"))


class ConversationTest(unittest.TestCase):
    def test_context_is_sent_every_turn_and_state_carries_over(self):
        replies = iter([
            turn_json("欢迎光临！", "Welcome!", "greeting", []),
            turn_json("好的，一杯拿铁。热的还是冰的？", "A latte. Hot or iced?", "customising", ["拿铁"]),
            turn_json("热的，好。还要别的吗？", "Hot, OK. Anything else?", "customising", ["热拿铁"]),
        ])
        fake = FakeBackend(lambda m: next(replies))
        conv = Conversation(fake, Settings(), seed=0)
        conv.start()
        t = conv.send("我要一杯拿铁。")
        self.assertEqual((t.stage, t.order), ("customising", ["拿铁"]))
        conv.send("热的。")
        last = fake.calls[-1]
        texts = " ".join(m["content"] for m in last)
        self.assertIn("我要一杯拿铁", texts)          # earlier learner turn is in context
        self.assertIn("热拿铁", conv.order[0])
        self.assertEqual(last[0]["role"], "system")
        self.assertEqual(conv.learner_sentences, ["我要一杯拿铁。", "热的。"])

    def test_history_stores_clean_json(self):
        fake = FakeBackend(lambda m: "Sure!\n```json\n" + turn_json("您好！", "Hi!", "greeting") + "\n```")
        conv = Conversation(fake, Settings())
        conv.start()
        stored = json.loads(conv.history[-1]["content"])
        self.assertEqual(stored["reply"], "您好！")

    def test_retry_then_success(self):
        answers = iter(["I'm sorry, what?", turn_json("您好！", "Hi!", "greeting")])
        fake = FakeBackend(lambda m: next(answers))
        t = Conversation(fake, Settings()).start()
        self.assertTrue(t.valid)
        self.assertEqual(t.retries, 1)
        self.assertIn("rejected", fake.calls[1][-1]["content"])

    def test_fallback_after_two_failures_never_shows_bad_output(self):
        fake = FakeBackend(lambda m: "Hello! As an AI language model I can help.")
        t = Conversation(fake, Settings()).start()
        self.assertFalse(t.valid)
        self.assertEqual(t.reply, FALLBACK_REPLY)
        self.assertEqual(len(fake.calls), 2)

    def test_salvages_plain_chinese(self):
        fake = FakeBackend(lambda m: "您好，欢迎光临！")
        t = Conversation(fake, Settings()).start()
        self.assertFalse(t.valid)
        self.assertEqual(t.reply, "您好，欢迎光临！")

    def test_empty_message_rejected(self):
        conv = Conversation(FakeBackend(lambda m: turn_json()), Settings())
        with self.assertRaises(ValueError):
            conv.send("   ")

    def test_history_window(self):
        fake = FakeBackend(lambda m: turn_json())
        conv = Conversation(fake, Settings(difficulty="Easy"), max_history_messages=4)
        conv.start()
        for i in range(6):
            conv.send(f"第{i}句")
        self.assertLessEqual(len(fake.calls[-1]), 5)  # system + 4

    def surprise_count(self, difficulty, seed, turns=12):
        fake = FakeBackend(lambda m: turn_json())
        conv = Conversation(fake, Settings(difficulty=difficulty), seed=seed)
        conv.start()
        for _ in range(turns):
            conv.send("好的")
        return sum(1 for c in fake.calls if "unexpected situation" in c[0]["content"])

    def test_surprises_follow_difficulty(self):
        self.assertEqual(self.surprise_count("Easy", 3), 0)
        for seed in range(10):
            self.assertLessEqual(self.surprise_count("Standard", seed), 1)
            self.assertLessEqual(self.surprise_count("Challenging", seed), 2)
        self.assertGreater(sum(self.surprise_count("Challenging", s) for s in range(10)), 0)

    def test_surprises_are_reproducible_with_a_seed(self):
        self.assertEqual(self.surprise_count("Challenging", 7), self.surprise_count("Challenging", 7))


if __name__ == "__main__":
    unittest.main()
