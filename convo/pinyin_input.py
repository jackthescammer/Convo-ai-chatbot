"""Typing in pinyin: turn 'wo yao yi bei kafei' into Chinese-character candidates.

For learners without a Chinese keyboard. The conversion is a dictionary lookup
(Pinyin2Hanzi's word-frequency graph), never the language model: the model would
quietly fix grammar, and then the feedback report could not show the learner
their own mistakes. The learner always sees the characters and picks one before
sending.

Limitations (documented, not hidden):
- Tones are ignored for lookup (tone marks and tone numbers are stripped), so
  the top candidate is the most common word for those sounds, not always the
  one the learner meant. That is why several candidates are shown.
- A misspelt syllable (e.g. 'kafie') cannot be converted; it is reported back.
"""

import re
import unicodedata

PUNCT = {",": "，", ".": "。", "?": "？", "!": "！", ":": "：", ";": "；"}

# a run of pinyin letters (plus spaces, apostrophes and tone numbers) vs everything else
_LETTERS = "a-zA-ZüÜǖǘǚǜāáǎàēéěèīíǐìōóǒòūúǔù"
_RUN = re.compile(rf"[{_LETTERS}'’0-5\s]+|[^{_LETTERS}'’0-5\s]+")
_HAS_LETTER = re.compile(rf"[{_LETTERS}]")


def strip_tones(text):
    """'nǐ hǎo', 'ni3 hao3' -> 'ni hao'; ü / u: -> v (the usual typing form)."""
    text = text.lower().replace("u:", "v")
    for c in "üǖǘǚǜ":
        text = text.replace(c, "v")
    text = "".join(c for c in unicodedata.normalize("NFD", text)
                   if unicodedata.category(c) != "Mn")
    return re.sub(r"[0-5]", " ", text)


def split_syllables(chunk, valid):
    """Split a run of letters into pinyin syllables, fewest syllables first.

    'kafei' -> ['ka', 'fei'];  'xian' -> ['xian'] (type xi'an or xi an for two).
    Returns None if the letters cannot be read as pinyin.
    """
    n = len(chunk)
    best = [None] * (n + 1)  # best[i] = syllable list for chunk[:i]
    best[0] = []
    for i in range(1, n + 1):
        for j in range(max(0, i - 6), i):  # longest syllable is 6 letters (zhuang)
            if best[j] is not None and chunk[j:i] in valid:
                cand = best[j] + [chunk[j:i]]
                if best[i] is None or len(cand) < len(best[i]):
                    best[i] = cand
    return best[n]


class PinyinConverter:
    """Pinyin -> list of candidate Chinese strings (best first)."""

    def __init__(self, lookup=None, syllables=None):
        # lookup(syllables, n) -> list of candidate strings for one pinyin run
        if lookup is None or syllables is None:
            lookup, syllables = _pinyin2hanzi()
        self.lookup = lookup
        self.valid = set(syllables)

    def syllables(self, run):
        """All syllables in a run of pinyin text, or raise ValueError naming the bad part."""
        out = []
        for word in re.split(r"[\s'’]+", strip_tones(run)):
            if not word:
                continue
            parts = split_syllables(word, self.valid)
            if parts is None:
                raise ValueError(word)
            out += parts
        return out

    def candidates(self, text, n=5):
        """Up to n candidate sentences. Chinese characters already typed are kept as they are.

        Returns (candidates, problem): problem is '' or the word that is not pinyin.
        """
        text = (text or "").strip()
        if not text:
            return [], ""
        pieces = []  # each piece: list of alternatives for that stretch of text
        for run in _RUN.findall(text):
            if _HAS_LETTER.search(run):
                try:
                    sylls = self.syllables(run)
                except ValueError as bad:
                    return [], str(bad)
                if sylls:
                    alts = [a for a in self.lookup(sylls, n) if a]
                    if not alts:
                        return [], " ".join(sylls)
                    pieces.append(alts)
            else:
                stripped = run.strip()
                if stripped:
                    pieces.append(["".join(PUNCT.get(c, c) for c in stripped)])
        # k-th candidate = k-th alternative of each pinyin stretch (top one if it has fewer)
        width = max(len(p) for p in pieces)
        out = []
        for k in range(min(n, width)):
            s = "".join(p[min(k, len(p) - 1)] for p in pieces)
            if s not in out:
                out.append(s)
        return out, ""


def _pinyin2hanzi():
    try:
        from Pinyin2Hanzi import DefaultDagParams, all_pinyin, dag
    except ImportError as exc:
        raise ImportError("pinyin typing needs the 'Pinyin2Hanzi' package: "
                          "pip install Pinyin2Hanzi") from exc
    params = DefaultDagParams()

    def lookup(sylls, n):
        return ["".join(item.path) for item in dag(params, tuple(sylls), path_num=n)]

    return lookup, list(all_pinyin())


def load_pinyin_converter():
    """The converter the app uses, or None (with a printed reason) if the package is missing."""
    try:
        conv = PinyinConverter()
    except ImportError as exc:
        print("[convo] pinyin typing off:", exc)
        return None
    print(f"[convo] pinyin typing on ({len(conv.valid)} syllables)")
    return conv
