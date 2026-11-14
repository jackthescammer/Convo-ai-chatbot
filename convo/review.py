"""Post-conversation feedback.

Each Chinese sentence the learner wrote is checked on its own (small prompts are
more reliable for a 3B model than one big report prompt). Counting, grouping,
pinyin and study tips are done in code, not by the model.
"""

from collections import Counter
from dataclasses import asdict, dataclass, field

from .prompts import build_assessment_prompt, build_review_prompt, build_verify_prompt
from .render import to_pinyin
from .structured import HAN, extract_json, validate_review

CATEGORY_LABELS = {
    "measure_word": "measure words",
    "word_order": "word order",
    "missing_particle": "missing particles (的, 了, 吗 ...)",
    "extra_word": "extra words",
    "vocabulary": "word choice",
    "question_structure": "question structure",
    "negation": "negation (不 vs 没)",
    "unnatural": "natural-sounding phrasing",
    "other": "other grammar",
}

CATEGORY_TIPS = {
    "measure_word": "Learn the measure word that goes with each drink and food: 杯 for drinks, 块 for cake, 份 for portions.",
    "word_order": "Chinese word order is usually: who + when + where + do what. Say a few model sentences out loud and swap in new words.",
    "missing_particle": "Practise 的 (possession), 了 (completed actions) and 吗 (yes/no questions) in short sentences.",
    "extra_word": "Try the shortest version first. Words like 是, 很, 的 and 了 are not needed in every sentence.",
    "vocabulary": "Pair verbs with their usual nouns, for example 喝 + drinks and 吃 + food.",
    "question_structure": "Use only one question marker per sentence: 吗, or 什么, or 还是, or a 有没有 pattern.",
    "negation": "Use 不 for habits, wants and 是; use 没 for 有 and for things that did not happen in the past.",
    "unnatural": "Listen for how real café staff and customers speak, then copy short natural phrases like 我要…, 请给我…, 多少钱？",
    "other": "Ask a Chinese speaker to look at these sentences and tell you the rule behind each fix.",
}

# Categories grouped into the report sections CLAUDE.md asks for.
_VOCAB = {"vocabulary"}
_NATURAL = {"unnatural"}


@dataclass
class SentenceReview:
    original: str
    has_error: bool = False
    corrected: str = ""
    category: str = "none"
    explanation: str = ""
    english: str = ""
    pinyin: str = ""
    valid: bool = True        # False = the model never gave a usable answer
    guard: str = ""
    problems: list = field(default_factory=list)


@dataclass
class Report:
    level: str
    difficulty: str
    reviews: list
    skipped: int
    assessment: str
    recurring: list       # [(category, count)] for categories seen 2+ times
    suggestions: list

    def to_dict(self):
        return asdict(self)

    def to_markdown(self):
        checked = [r for r in self.reviews if r.valid]
        errors = [r for r in checked if r.has_error]
        correct = [r for r in checked if not r.has_error]
        out = ["# Your conversation report", "",
               f"Level **{self.level}** · Difficulty **{self.difficulty}** · "
               f"{len(checked)} sentence(s) checked, {len(errors)} with a correction", ""]
        if not self.reviews:
            out += ["You didn't write any Chinese sentences this time, so there is nothing to review. "
                    "Try again and answer the waiter in Chinese.", ""]
            return "\n".join(out)

        out += ["## Overall", self.assessment, ""]

        def entries(items):
            lines = []
            for r in items:
                lines += [f"- **You wrote:** {r.original}",
                          f"  - **Better:** {r.corrected}" + (f" ({r.pinyin})" if r.pinyin else ""),
                          ]
                if r.english:
                    lines.append(f"  - **Meaning:** {r.english}")
                lines.append(f"  - **Why:** {r.explanation}")
            return lines + [""]

        grammar = [r for r in errors if r.category not in _VOCAB | _NATURAL]
        vocab = [r for r in errors if r.category in _VOCAB]
        natural = [r for r in errors if r.category in _NATURAL]
        if grammar:
            out += ["## Grammar corrections"] + entries(grammar)
        if vocab:
            out += ["## Vocabulary improvements"] + entries(vocab)
        if natural:
            out += ["## More natural expressions"] + entries(natural)
        if correct:
            out += ["## Already correct", *[f"- {r.original}" for r in correct], ""]
        if self.recurring:
            out += ["## Recurring weaknesses",
                    *[f"- {CATEGORY_LABELS.get(c, c)}: {n} times" for c, n in self.recurring], ""]
        if self.suggestions:
            out += ["## Suggested next steps", *[f"- {s}" for s in self.suggestions], ""]
        unchecked = len(self.reviews) - len(checked)
        notes = []
        if unchecked:
            notes.append(f"{unchecked} sentence(s) could not be checked automatically.")
        if self.skipped:
            notes.append(f"{self.skipped} message(s) without Chinese were skipped.")
        notes.append("This is an automatic check by a small AI model and can be wrong. "
                     "Ask a teacher or Chinese speaker when unsure.")
        out += ["---", " ".join(notes)]
        return "\n".join(out)


def review_sentence(backend, sentence, level="A2", *, temperature=0.0, max_retries=1,
                    max_new_tokens=300):
    """Check one learner sentence. Returns a SentenceReview (valid=False if unusable)."""
    messages = [{"role": "system", "content": build_review_prompt(level)},
                {"role": "user", "content": sentence}]
    problems = []
    for _ in range(max_retries + 1):
        raw = backend.generate(messages, max_new_tokens=max_new_tokens, temperature=temperature)
        payload, problems = validate_review(extract_json(raw), sentence)
        if payload:
            if payload.has_error and _verified_correct(backend, sentence, max_new_tokens):
                # A separate yes/no check says the original was already fine: keep it unchanged.
                return SentenceReview(original=sentence, corrected=sentence, english=payload.english,
                                      guard="verified_correct")
            return SentenceReview(original=sentence, has_error=payload.has_error,
                                  corrected=payload.corrected, category=payload.category,
                                  explanation=payload.explanation, english=payload.english,
                                  guard=payload.guard)
        messages = messages + [
            {"role": "assistant", "content": raw},
            {"role": "user", "content": "That answer was rejected: " + "; ".join(problems)
             + ". Answer again with only the JSON object."},
        ]
    return SentenceReview(original=sentence, corrected=sentence, valid=False, problems=problems)


def _verified_correct(backend, sentence, max_new_tokens=60):
    """True only if the model clearly answers that the original sentence is already correct.

    Any unclear or invalid answer keeps the checker's original decision.
    """
    raw = backend.generate([{"role": "system", "content": build_verify_prompt()},
                            {"role": "user", "content": sentence}],
                           max_new_tokens=min(max_new_tokens, 60), temperature=0.0)
    obj = extract_json(raw)
    return isinstance(obj, dict) and obj.get("correct") is True


def _stats_text(reviews):
    checked = [r for r in reviews if r.valid]
    errors = [r for r in checked if r.has_error]
    lines = [f"Sentences checked: {len(checked)}. Sentences with mistakes: {len(errors)}."]
    counts = Counter(r.category for r in errors)
    if counts:
        lines.append("Mistake types: " + ", ".join(
            f"{CATEGORY_LABELS.get(c, c)} x{n}" for c, n in counts.most_common()))
    else:
        lines.append("There were no mistakes.")
    for r in errors[:5]:
        lines.append(f'Example: wrote "{r.original}", better "{r.corrected}" ({r.category}).')
    return "\n".join(lines)


def _fallback_assessment(reviews):
    checked = [r for r in reviews if r.valid]
    errors = [r for r in checked if r.has_error]
    if not checked:
        return "We couldn't check your sentences this time."
    if not errors:
        return f"All {len(checked)} sentence(s) you wrote were correct. Great work. Try a harder difficulty next time."
    return (f"You wrote {len(checked)} sentence(s) and {len(errors)} had a correction. "
            "Look at the corrections below and try using the better versions in your next conversation.")


def _assessment(backend, level, reviews):
    prompt = build_assessment_prompt(level, _stats_text(reviews))
    raw = backend.generate([{"role": "user", "content": prompt}], max_new_tokens=200, temperature=0.3)
    obj = extract_json(raw)
    text = obj.get("assessment") if isinstance(obj, dict) else None
    if isinstance(text, str) and 20 <= len(text.strip()) <= 700:
        return text.strip()
    return _fallback_assessment(reviews)


def build_report(backend, learner_sentences, settings, *, pinyin_fn=to_pinyin):
    """Review every Chinese sentence the learner wrote and assemble the report."""
    chinese = [s for s in learner_sentences if HAN.search(s)]
    skipped = len(learner_sentences) - len(chinese)
    reviews = [review_sentence(backend, s, settings.level) for s in chinese]
    for r in reviews:
        if r.valid and r.has_error:
            r.pinyin = pinyin_fn(r.corrected)

    counts = Counter(r.category for r in reviews if r.valid and r.has_error)
    recurring = [(c, n) for c, n in counts.most_common() if n >= 2]
    tip_categories = [c for c, _ in counts.most_common(3)]
    suggestions = [CATEGORY_TIPS[c] for c in tip_categories]

    assessment = _assessment(backend, settings.level, reviews) if reviews else ""
    return Report(level=settings.level, difficulty=settings.difficulty, reviews=reviews,
                  skipped=skipped, assessment=assessment, recurring=recurring,
                  suggestions=suggestions)
