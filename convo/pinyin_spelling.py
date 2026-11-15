"""Spelling help for typed pinyin: which words aren't pinyin, what was probably meant, and why.

Rule-based (syllable list, edit distance, café words), never the language model, so the
learner's own grammar is left for the checker to judge.

Two kinds of problem:
- not pinyin at all ('yir'): no way to split it into real syllables;
- an odd split ('yeao' only reads as ye + ao): flagged when one of the parts is not a café
  syllable and a café syllable is one letter away ('yao'). Real words like 'nihao' or
  'kafei' split into café syllables, so they are left alone.
"""

import re
from collections import Counter

from .pinyin_input import split_syllables, strip_tones

_WORD = re.compile(r"[a-zA-ZüÜ:āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+[0-5]?")


def _dist(a, b):
    """Edit distance (insert, delete, change one letter)."""
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def cafe_syllables(cafe_index):
    """How often each syllable appears in the café words (more = more likely meant)."""
    return Counter(s for key in cafe_index for s in key)


def suggest(word, valid, weights):
    """The most likely intended syllable, or None if nothing is close."""
    if not valid:
        return None
    best = min(valid, key=lambda s: (_dist(word, s), -weights.get(s, 0), abs(len(s) - len(word)), s))
    return best if _dist(word, best) <= max(1, len(word) // 2) else None


def why_not_pinyin(word):
    """A short, plain reason a word can't be pinyin."""
    if word.endswith("r") and word != "er":
        return "only 'er' ends in r in pinyin; other syllables end in a vowel, n or ng"
    if word[-1] not in "aeiouvng":
        return f"pinyin syllables end in a vowel, n or ng, so it can't end in '{word[-1]}'"
    if re.search(r"[aeiouv]{4,}", word):
        return "it has too many vowels in a row for pinyin"
    return f"no Mandarin syllable is spelled '{word}'"


def spelling_feedback(text, converter):
    """{'issues': [{'typed', 'suggest', 'char', 'reason'}], 'fixed': text with suggestions swapped in}."""
    valid = getattr(converter, "valid", None) or set()
    weights = cafe_syllables(getattr(converter, "cafe_index", {}) or {})
    issues = []

    def char_for(syllable):
        try:
            cands, _ = converter.candidates(syllable, n=1)
        except Exception:
            return ""
        return cands[0] if cands else ""

    def fix(m):
        tok = m.group()
        letters = tok[:-1] if tok[-1].isdigit() else tok
        base = strip_tones(letters).strip()
        if not base or base in valid:
            return tok
        parts = split_syllables(base, valid)
        if parts is None:
            sug = suggest(base, valid, weights)
            issues.append({"typed": tok, "suggest": sug or "", "char": char_for(sug) if sug else "",
                           "reason": why_not_pinyin(base)})
            return sug or tok
        if len(parts) > 1 and weights and any(weights.get(p, 0) == 0 for p in parts):
            near = suggest(base, valid, weights)
            if near and _dist(base, near) == 1 and weights.get(near, 0) > 0:
                issues.append({"typed": tok, "suggest": near, "char": char_for(near),
                               "reason": f"it can only be read as {' + '.join(parts)}, which probably isn't what you meant"})
                return near
        return tok

    fixed = _WORD.sub(fix, text or "")
    return {"issues": issues, "fixed": fixed}
