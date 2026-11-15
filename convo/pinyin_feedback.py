"""Tone feedback for typed pinyin: did the learner add tones, and are they right?

Display only (live feedback). The right tones come from pypinyin's reading of the
characters we checked, never from the language model. Tone changes for 一 and 不
are accepted either way, and a missing mark on a neutral-tone syllable (吗, 的 ...)
is not counted as a mistake.
"""

import re

from .pinyin_input import split_syllables, strip_tones

MARKS = {c: tone for tone, chars in {1: "āēīōūǖ", 2: "áéíóúǘ", 3: "ǎěǐǒǔǚ", 4: "àèìòùǜ"}.items()
         for c in chars}
_TOKEN = re.compile(r"[a-zA-ZüÜ:" + "".join(MARKS) + r"]+[0-5]?")
_HAN = re.compile(r"[一-鿿]")
_FLEXIBLE = {"一": {1, 2, 4}, "不": {2, 4}}  # tone sandhi: the dictionary tone or the changed one


def toned_syllables(sentence):
    """[(char, 'wǒ', 3), ...] for each Chinese character (tone 5 = neutral)."""
    from pypinyin import Style, lazy_pinyin
    chars = _HAN.findall(sentence)
    text = "".join(chars)
    marked = lazy_pinyin(text, style=Style.TONE)
    numbered = lazy_pinyin(text, style=Style.TONE3, neutral_tone_with_five=True)
    return [(c, m, int(n[-1]) if n[-1:].isdigit() else 5) for c, m, n in zip(chars, marked, numbered)]


def typed_tones(text, valid):
    """[('hao3', 3), ('wo', 0), ...]: each typed syllable and its tone (0 = none given).
    None if the text can't be split into syllables cleanly."""
    out = []
    for tok in _TOKEN.findall(text or ""):
        digit = int(tok[-1]) if tok[-1].isdigit() else None
        letters = tok[:-1] if digit is not None else tok
        base = strip_tones(letters).strip()
        parts = split_syllables(base, valid) if base else None
        if not parts:
            return None
        if digit is not None:  # 'hao3' style: one number for one syllable
            if len(parts) != 1:
                return None
            out.append((tok, 5 if digit == 0 else digit))
            continue
        if len(base) != len(letters):  # e.g. 'u:' typed for ü: can't line marks up letter by letter
            if any(c in MARKS for c in letters):
                return None
            out += [(p, 0) for p in parts]
            continue
        i = 0
        for p in parts:  # 'kāfēi': give each syllable the mark inside its own letters
            seg = letters[i:i + len(p)]
            i += len(p)
            out.append((seg, next((MARKS[c] for c in seg if c in MARKS), 0)))
    return out


def tone_feedback(typed, sentence, valid, syllable_fn=toned_syllables):
    """Compare typed pinyin with the right tones for `sentence`.

    status: 'ok' (tones right), 'none' (no tones typed), 'partial' (some missing or wrong),
    'check' (couldn't line the syllables up; `expected` is still shown).
    """
    expected = syllable_fn(sentence)
    res = {"status": "ok", "expected": " ".join(m for _, m, _ in expected), "missing": 0, "wrong": []}
    tones = typed_tones(typed, valid)
    if tones is None or len(tones) != len(expected):
        any_tone = any(c in MARKS for c in typed) or bool(re.search(r"[a-zü][1-5]", typed.lower()))
        res["status"] = "check" if any_tone else "none"
        return res
    needs_tone = 0
    for (syl, t), (ch, mark, tone) in zip(tones, expected):
        if tone != 5:
            needs_tone += 1
        if t == 0:
            res["missing"] += tone != 5
        elif t not in _FLEXIBLE.get(ch, {tone}) and not (tone == 5 and t == 5):
            res["wrong"].append({"char": ch, "typed": syl, "expected": mark})
    if res["wrong"] or res["missing"]:
        res["status"] = "none" if res["missing"] == needs_tone and not res["wrong"] else "partial"
    return res
