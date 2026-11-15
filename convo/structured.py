"""Parsing and validation of model output.

The model is asked for JSON. Nothing it produces is shown to the learner until it
passes these checks (CLAUDE.md: "Validate generated outputs before displaying them").
"""

import json
import re
from dataclasses import dataclass, field

from .prompts import CATEGORIES

HAN = re.compile(r"[一-鿿]")
STAGES = ("greeting", "ordering", "customising", "payment", "done")  # the café's (scenarios.py)
MAX_REPLY_CHARS = 120
META_PHRASES = (
    "作为ai", "作为一个ai", "作为人工智能", "语言模型", "人工智能", "ai助手",
    "as an ai", "language model", "i am an ai", "i'm an ai",
)
_TONE_MARKS = re.compile(r"[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]")
_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.S)
_STRIP = re.compile(r"[\s　，。？！、；：“”‘’「」『』（）()\[\],.?!;:\"'…—-]+")


def normalise(text):
    """Remove spaces and punctuation so sentences can be compared on their words only."""
    return _STRIP.sub("", text or "").lower()


def extract_json(text):
    """Return the first JSON object found in `text` (tolerates code fences and chatter)."""
    if not text:
        return None
    decoder = json.JSONDecoder()
    for chunk in [text] + _FENCE.findall(text):
        for match in re.finditer(r"\{", chunk):
            try:
                obj, _ = decoder.raw_decode(chunk[match.start():])
            except ValueError:
                continue
            if isinstance(obj, dict):
                return obj
    return None


# ------------------------------------------------------------- character turns

@dataclass
class TurnPayload:
    reply: str
    english: str
    stage: str
    order: list = field(default_factory=list)


def reply_problems(reply):
    """Reasons a character reply is not acceptable (empty list = fine)."""
    problems = []
    if not HAN.search(reply):
        problems.append("the reply must be in Chinese")
    letters = len(re.findall(r"[A-Za-z]", reply)) + len(_TONE_MARKS.findall(reply))
    visible = len(re.sub(r"\s", "", reply))
    if visible and letters / visible > 0.2:
        problems.append("the reply contains English or pinyin; use Chinese characters only")
    if len(reply) > MAX_REPLY_CHARS:
        problems.append(f"the reply is too long (max {MAX_REPLY_CHARS} characters)")
    lowered = reply.lower()
    if any(p in lowered for p in META_PHRASES):
        problems.append("the reply breaks character (mentions being an AI)")
    return problems


def validate_turn(obj, prev_stage="greeting", prev_order=None, *, stages=STAGES, list_key="order"):
    """Return (TurnPayload, []) if `obj` is a good character turn, else (None, problems).

    `stages` and `list_key` come from the scenario: the state list is called "order" in the café,
    "basket" in the shop, "facts" in the interview, and so on. It is kept as `order` here."""
    prev_order = list(prev_order or [])
    if not isinstance(obj, dict):
        return None, ["the answer was not a JSON object"]
    reply = obj.get("reply")
    if not isinstance(reply, str) or not reply.strip():
        return None, ['the JSON has no "reply" text']
    reply = reply.strip()
    problems = reply_problems(reply)
    if problems:
        return None, problems

    english = obj.get("english")
    english = english.strip() if isinstance(english, str) else ""

    state = obj.get("state") if isinstance(obj.get("state"), dict) else {}
    stage = state.get("stage") if state.get("stage") in stages else prev_stage
    order = state.get(list_key)
    if isinstance(order, list) and all(isinstance(i, str) for i in order):
        order = [i.strip() for i in order if i.strip()]
    else:
        order = prev_order
    return TurnPayload(reply=reply, english=english, stage=stage, order=order), []


# -------------------------------------------------------------- sentence review

@dataclass
class ReviewPayload:
    has_error: bool
    corrected: str
    category: str
    explanation: str
    english: str
    guard: str = ""  # set when we overrode the model, e.g. "no_change"


def _as_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str) and value.strip().lower() in ("true", "false"):
        return value.strip().lower() == "true"
    return None


def validate_review(obj, original):
    """Return (ReviewPayload, []) or (None, problems) for a sentence-review answer."""
    if not isinstance(obj, dict):
        return None, ["the answer was not a JSON object"]
    problems = []
    has_error = _as_bool(obj.get("has_error"))
    if has_error is None:
        problems.append('"has_error" must be true or false')
    corrected = obj.get("corrected")
    if not isinstance(corrected, str) or not corrected.strip():
        problems.append('"corrected" must be a sentence')
        corrected = ""
    corrected = corrected.strip()
    explanation = obj.get("explanation")
    explanation = explanation.strip() if isinstance(explanation, str) else ""
    if has_error and not HAN.search(corrected):
        problems.append('"corrected" must be Chinese')
    if has_error and not explanation:
        problems.append('"explanation" is required when has_error is true')
    if problems:
        return None, problems

    english = obj.get("english")
    english = english.strip() if isinstance(english, str) else ""
    guard = ""
    if has_error and normalise(corrected) == normalise(original):
        # The model claimed a mistake but changed nothing: that is not a correction.
        has_error, guard = False, "no_change"
    if not has_error:
        return ReviewPayload(False, original, "none", "", english, guard), []
    category = obj.get("category")
    category = category if category in CATEGORIES else "other"
    return ReviewPayload(True, corrected, category, explanation, english, guard), []
