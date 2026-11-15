"""Turn check: did the learner's message respond to the character, or go off script?

Used by the live app only (not by the scored evaluation, which never turns it on):
- the character gets a short hidden note, so it asks again instead of assuming an answer
  ("hot or iced?" when no drink was named) and steers back after an off-topic or rude message;
- the live feedback card warns the learner.

Any unclear answer from the model counts as "answer", so a shaky check never interrupts a
normal conversation.
"""

import re

from .structured import extract_json

_CJK = re.compile(r"[一-鿿]")

KINDS = ("answer", "no_answer", "off_topic", "inappropriate")

# Hidden one-off instructions for the character's next reply (added to its system prompt for that
# reply only; never shown to the learner).
STEER = {
    "no_answer": ("The {learner} did not answer what you just asked. Do not assume any answer and do "
                  "not move on. Ask the same question again, simply."),
    "off_topic": ("The {learner} just changed the subject to something unrelated. Do NOT talk about "
                  "it or ask about it. In one short sentence, politely go back to the {roleplay}: ask "
                  "again what you asked before."),
    "inappropriate": ("The {learner} said something rude or not appropriate. Do not repeat it or talk "
                      "about it. Stay calm and polite, and go straight back to the {roleplay}: ask "
                      "again what you asked before."),
}

ANSWER = {"kind": "answer", "note": ""}


def build_turn_check_prompt(scenario):
    s = scenario
    return (
        f"You check a language-learning role-play. {s.character} is a {s.role}; the learner plays the "
        f"{s.learner}. Read the {s.role}'s last line and the learner's reply, and classify the reply:\n"
        f'- "answer": it responds to the line or naturally moves the conversation on (any reasonable '
        f"thing a {s.learner} would say here, including questions and short answers);\n"
        f'- "no_answer": polite, but it ignores a question the {s.role} asked (for example only saying '
        f"hello when asked what they would like);\n"
        f'- "off_topic": it has nothing to do with this situation;\n'
        f'- "inappropriate": rude, offensive or not okay to say to a {s.role}.\n'
        "Grammar and spelling mistakes do not matter. The reply may be in Chinese characters or pinyin.\n"
        'Reply with only a JSON object: {"kind": "answer|no_answer|off_topic|inappropriate", '
        '"note": "<one short sentence in English telling the learner what to do next>"}'
    )


def judge_turn(backend, scenario, character_line, learner_text):
    """{'kind': one of KINDS, 'note': str}. Unclear answers count as 'answer'."""
    if not character_line or not (learner_text or "").strip():
        return dict(ANSWER)
    raw = backend.generate([
        {"role": "system", "content": build_turn_check_prompt(scenario)},
        {"role": "user", "content": f"{scenario.role}: {character_line}\nLearner: {learner_text}"},
    ], max_new_tokens=80, temperature=0.0)
    obj = extract_json(raw)
    kind = obj.get("kind") if isinstance(obj, dict) else None
    if kind not in KINDS or kind == "answer":
        return dict(ANSWER)
    note = str(obj.get("note") or "").strip()[:200]
    if _CJK.search(note):  # the tip is for an A2 learner: if it came back in Chinese, the website shows its own
        note = ""
    return {"kind": kind, "note": note}


def steer_note(kind, scenario):
    """The hidden note for the character, or '' when the learner answered."""
    note = STEER.get(kind, "")
    where = scenario.roleplay if "conversation" in scenario.roleplay else f"{scenario.roleplay} conversation"
    return note.format(learner=scenario.learner, roleplay=where) if note else ""
