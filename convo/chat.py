"""The conversation engine: history, context, difficulty adaptation, validation."""

import json
import random
from dataclasses import dataclass, field

from .prompts import build_system_prompt
from .scenarios import get_scenario
from .settings import Settings
from .structured import extract_json, reply_problems, validate_turn

FALLBACK_REPLY = "不好意思，您能再说一遍吗？"
FALLBACK_ENGLISH = "Sorry, could you say that again?"

# Chance, per eligible turn, that the character raises a small unexpected situation.
SURPRISE_CHANCE = {"Easy": 0.0, "Standard": 0.3, "Challenging": 0.5}
MAX_SURPRISES = {"Easy": 0, "Standard": 1, "Challenging": 2}


@dataclass
class Turn:
    """One character turn, after validation."""

    reply: str
    english: str
    stage: str
    order: list = field(default_factory=list)  # the scenario's state list (order, basket, facts ...)
    valid: bool = True     # False means we had to fall back (see `problems`)
    retries: int = 0       # 0 = the model got it right first time
    problems: list = field(default_factory=list)
    raw: str = ""
    surprise: str = ""


class Conversation:
    def __init__(self, backend, settings=None, *, seed=None, temperature=0.7,
                 max_new_tokens=250, max_history_messages=24):
        self.backend = backend
        self.settings = settings or Settings()
        self.scenario = get_scenario(self.settings.scenario)
        self.temperature = temperature
        self.max_new_tokens = max_new_tokens
        self.max_history_messages = max_history_messages
        self.rng = random.Random(seed)

        self.history = []            # model-visible messages (no system prompt)
        self.turns = []              # validated character turns
        self.learner_sentences = []  # what the learner typed
        self.stage = self.scenario.stages[0]
        self.order = []
        self._surprises_used = 0

    # ------------------------------------------------------------------ public

    def start(self):
        """The character speaks first."""
        cue = self.scenario.opening_cue
        if self.scenario.topics:  # open conversation: the character picks what to talk about
            cue = cue.format(topic=self.rng.choice(self.scenario.topics))
        self.history.append({"role": "user", "content": cue})
        return self._respond()

    def send(self, text):
        text = (text or "").strip()
        if not text:
            raise ValueError("empty message")
        self.learner_sentences.append(text)
        self.history.append({"role": "user", "content": text})
        return self._respond()

    # ---------------------------------------------------------------- internal

    def _pick_surprise(self):
        difficulty = self.settings.difficulty
        if (len(self.learner_sentences) < 2
                or self.stage == "done"
                or self._surprises_used >= MAX_SURPRISES[difficulty]
                or self.rng.random() >= SURPRISE_CHANCE[difficulty]):
            return ""
        self._surprises_used += 1
        return self.rng.choice(self.scenario.surprises)

    def _respond(self):
        surprise = self._pick_surprise()
        system = build_system_prompt(self.settings, surprise or None)
        window = self.history[-self.max_history_messages:]
        turn = self._generate_validated([{"role": "system", "content": system}] + window)
        turn.surprise = surprise

        self.stage, self.order = turn.stage, list(turn.order)
        self.turns.append(turn)
        # Store a clean, canonical version so the model always sees well-formed history.
        canonical = {"reply": turn.reply, "english": turn.english,
                     "state": {"stage": turn.stage, self.scenario.state_key: turn.order}}
        self.history.append({"role": "assistant",
                             "content": json.dumps(canonical, ensure_ascii=False)})
        return turn

    def _generate_validated(self, messages, attempts=2):
        problems, raw = [], ""
        for attempt in range(attempts):
            raw = self.backend.generate(messages, max_new_tokens=self.max_new_tokens,
                                        temperature=self.temperature)
            payload, problems = validate_turn(extract_json(raw), self.stage, self.order,
                                              stages=self.scenario.stages,
                                              list_key=self.scenario.state_key)
            if payload:
                return Turn(reply=payload.reply, english=payload.english, stage=payload.stage,
                            order=payload.order, valid=True, retries=attempt, raw=raw)
            messages = messages + [
                {"role": "assistant", "content": raw},
                {"role": "user", "content": "That answer was rejected: " + "; ".join(problems)
                 + ". Answer again with only the JSON object."},
            ]
        return self._fallback(raw, problems)

    def _fallback(self, raw, problems):
        """Both attempts failed. Salvage plain Chinese text if it is acceptable, else apologise."""
        line = next((l.strip() for l in raw.splitlines() if l.strip()), "")
        if line and not line.startswith(("{", "[", "`")) and not reply_problems(line):
            reply, english = line, ""
        else:
            reply, english = FALLBACK_REPLY, FALLBACK_ENGLISH
        return Turn(reply=reply, english=english, stage=self.stage, order=list(self.order),
                    valid=False, retries=2, problems=list(problems), raw=raw)
