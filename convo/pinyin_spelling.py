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
    """Edit distance: insert, delete or change one letter, or swap two neighbours ('kafie' -> 'kafei' is 1)."""
    d = [[i + j if i * j == 0 else 0 for j in range(len(b) + 1)] for i in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] != b[j - 1]))
            if i > 1 and j > 1 and a[i - 1] == b[j - 2] and a[i - 2] == b[j - 1]:
                d[i][j] = min(d[i][j], d[i - 2][j - 2] + 1)
    return d[-1][-1]


def cafe_syllables(cafe_index):
    """How often each syllable appears in the café words (more = more likely meant)."""
    return Counter(s for key in cafe_index for s in key)


def suggest(word, valid, weights):
    """The most likely intended syllable, or None if nothing is close."""
    valid = [s for s in valid if s not in NOT_SYLLABLES]
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


# Everyday English words a learner might type in a café-style chat. Only used to spot English;
# 'a', 'an', 'you', 'he', 'me' etc. are also real pinyin, so English needs more than one clue.
ENGLISH_WORDS = set("""
i you he she it we they me my your our the a an is am are was were be will would can could do does
did have has had not no yes ok okay please thank thanks thankyou hello hi hey bye goodbye sorry
what how much many where when why which who want would like need get give take make leave now go
going come here there this that these those and or but so with without for to of in on at from
coffee tea water milk sugar ice iced hot cold cake bread menu bill pay cash card large small medium
good great nice fine just very really too also more less some any one two three cup glass please
""".split())
# Entries in the syllable list that aren't syllables a learner should be offered.
NOT_SYLLABLES = {"null"}
_ALPHA_WORD = re.compile(r"[A-Za-z']+")


def looks_like_english(text, converter):
    """True when a message is English rather than pinyin (no Chinese characters).

    English if most of its words are common English words, or if most words can't be read as
    pinyin at all. Short real pinyin ('ni hao', 'wo yao yi bei kafei') reads as pinyin.
    """
    words = [w.lower().strip("'") for w in _ALPHA_WORD.findall(text or "")]
    words = [w for w in words if w]
    if not words:
        return False
    valid = getattr(converter, "valid", None) or set()
    english = sum(w in ENGLISH_WORDS for w in words)
    pinyin = sum(bool(valid) and split_syllables(strip_tones(w).strip(), valid) is not None for w in words)
    if english * 2 >= len(words) and english > pinyin - english:
        return True
    return len(words) >= 2 and pinyin * 2 < len(words)


def spelling_feedback(text, converter):
    """{'issues': [{'typed', 'suggest', 'char', 'reason'}], 'fixed': text with suggestions swapped in}."""
    valid = getattr(converter, "valid", None) or set()
    cafe_index = getattr(converter, "cafe_index", {}) or {}
    weights = cafe_syllables(cafe_index)
    # whole café words typed as one word ('kafei') can be suggested too, ahead of single syllables
    words = {"".join(key): max(weights.values(), default=0) + 1 for key in cafe_index if len(key) > 1}
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
            sug = suggest(base, valid | set(words), {**weights, **words})
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
