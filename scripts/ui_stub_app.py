"""Launch the app with a stand-in waiter, to test the screens without a GPU.

The waiter's replies are canned (this is NOT the AI model): use it only to check
buttons, pinyin typing and layout. Prints a public share link.

    python scripts/ui_stub_app.py
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import build_app  # noqa: E402

REPLIES = [
    ("您好！欢迎光临。您想喝点什么？", "Hello! Welcome. What would you like to drink?"),
    ("好的。要热的还是冰的？", "Sure. Hot or iced?"),
    ("好的，还要别的吗？", "OK, anything else?"),
]


class StubBackend:
    name = "STUB waiter (UI test only, not the AI model)"

    def __init__(self):
        self.n = 0

    def generate(self, messages, *, max_new_tokens=300, temperature=0.0):
        if messages[0]["content"].startswith("You are a native Mandarin speaker"):
            return json.dumps({"better": "A"})
        if "has_error" in messages[0]["content"]:
            return json.dumps({"has_error": False, "corrected": "", "category": "none",
                               "explanation": "", "english": ""})
        reply, english = REPLIES[min(self.n, len(REPLIES) - 1)]
        self.n += 1
        return json.dumps({"reply": reply, "english": english,
                           "state": {"stage": "ordering", "order": []}}, ensure_ascii=False)


if __name__ == "__main__":
    build_app(StubBackend()).launch(share=True)
