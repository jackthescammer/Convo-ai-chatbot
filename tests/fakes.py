"""A scripted stand-in for the language model, so logic can be tested without a GPU."""

import json


class FakeBackend:
    name = "fake-model"

    def __init__(self, handler, verify=None):
        """`handler(messages) -> str` decides each answer. All calls are recorded.

        If `verify` is given, it is returned for the second (A/B) check instead of calling handler.
        """
        self.handler = handler
        self.verify = verify
        self.calls = []

    def generate(self, messages, *, max_new_tokens=300, temperature=0.0):
        self.calls.append(messages)
        if self.verify is not None and messages[0]["content"].startswith("You are a native Mandarin speaker"):
            return self.verify
        return self.handler(messages)


def turn_json(reply="您想喝点什么？", english="What would you like to drink?", stage="ordering", order=None):
    return json.dumps({"reply": reply, "english": english,
                       "state": {"stage": stage, "order": order or []}}, ensure_ascii=False)


def review_json(has_error=False, corrected="", category="none", explanation="", english=""):
    return json.dumps({"has_error": has_error, "corrected": corrected, "category": category,
                       "explanation": explanation, "english": english}, ensure_ascii=False)
