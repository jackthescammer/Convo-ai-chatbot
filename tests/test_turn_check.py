"""Turn check: the character asks again / steers back, and the live app can warn the learner."""

import json
import unittest

from convo import Settings
from convo.chat import Conversation
from convo.scenarios import get_scenario
from convo.turn_check import judge_turn, steer_note
from fakes import FakeBackend, turn_json

CHECK = "You check a language-learning role-play"


def backend(verdict):
    def handler(m):
        if m[0]["content"].startswith(CHECK):
            return json.dumps(verdict)
        return turn_json("热的还是冰的？", "Hot or iced?")
    return FakeBackend(handler)


class TurnCheck(unittest.TestCase):
    def test_no_answer_adds_a_hidden_note_for_this_reply_only(self):
        b = backend({"kind": "no_answer", "note": "Say what you would like to drink."})
        conv = Conversation(b, Settings(), seed=1, turn_check=True)
        conv.start()
        conv.send("你好")
        reply_call = b.calls[-1]
        self.assertIn("did not answer", reply_call[0]["content"])        # in the system prompt, this reply
        self.assertEqual(reply_call[-1], {"role": "user", "content": "你好"})  # the message itself is clean
        self.assertFalse(any("did not answer" in m["content"] for m in conv.history))  # nothing kept
        self.assertEqual(conv.last_verdict["kind"], "no_answer")

    def test_answer_changes_nothing(self):
        b = backend({"kind": "answer", "note": ""})
        conv = Conversation(b, Settings(), seed=1, turn_check=True)
        conv.start()
        conv.send("我要一杯咖啡")
        self.assertEqual(b.calls[-1][-1]["content"], "我要一杯咖啡")

    def test_off_by_default_so_the_evaluation_is_unchanged(self):
        b = backend({"kind": "off_topic", "note": "x"})
        conv = Conversation(b, Settings(), seed=1)
        conv.start()
        conv.send("今天天气很好")
        self.assertFalse(any(c[0]["content"].startswith(CHECK) for c in b.calls))

    def test_unclear_verdict_counts_as_answer(self):
        cafe = get_scenario("cafe")
        self.assertEqual(judge_turn(FakeBackend(lambda m: "not json"), cafe, "您想喝什么？", "你好")["kind"], "answer")
        self.assertEqual(judge_turn(FakeBackend(lambda m: '{"kind": "maybe"}'), cafe, "您想喝什么？", "你好")["kind"],
                         "answer")

    def test_steer_note_uses_the_scenario_words(self):
        self.assertIn("candidate", steer_note("off_topic", get_scenario("interview")))
        self.assertEqual(steer_note("answer", get_scenario("cafe")), "")


if __name__ == "__main__":
    unittest.main()
