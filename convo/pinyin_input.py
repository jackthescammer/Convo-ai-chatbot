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

# Everyday café words (A1–A2). Used only to *re-rank* the dictionary's candidates, so that
# "yi bei" puts 一杯 before 已被. Nothing is generated from this list.
CAFE_WORDS = set("""
我 你 您 他 她 我们 你们 要 想 喝 吃 买 有 没有 是 不 不要 不用 可以 能 请 请问 谢谢 你好 好的 好 对 没 了 吗 呢 吧 的
一 两 二 三 四 五 一个 一杯 两杯 三杯 一块 两块 一份 一瓶 杯 块 个 份 瓶 大杯 中杯 小杯 大 中 小 多 少 多少 多少钱 钱 块钱 元
咖啡 拿铁 美式 卡布奇诺 摩卡 绿茶 红茶 奶茶 茶 牛奶 水 冰水 果汁 橙汁 可乐 热 冰 加冰 去冰 少冰 常温 糖 加糖 无糖 少糖 半糖 奶
蛋糕 面包 三明治 饼干 甜点 早餐 菜单 位子 座位 靠窗 外带 带走 打包 在这儿 这里 这儿 那 这 这个 那个 哪个 什么 怎么 还 再 也 都 就
刷卡 现金 微信 支付宝 付钱 结账 买单 发票 收据 洗手间 厕所 在哪里 哪里 等 等一下 马上 慢 快 一下 一点 一点儿 太 很 非常 真 甜 苦 好喝 好吃
今天 明天 现在 朋友 服务员 先生 小姐 老板 欢迎 光临 再见 对不起 没关系 知道 喜欢 觉得 点 换 给 拿 送
""".split())

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


def cafe_coverage(text, words=CAFE_WORDS):
    """How many characters of `text` can be covered by café words (best non-overlapping cover)."""
    n = len(text)
    best = [0] * (n + 1)
    for i in range(1, n + 1):
        best[i] = best[i - 1]
        for j in range(max(0, i - 5), i):
            if text[j:i] in words:
                best[i] = max(best[i], best[j] + (i - j))
    return best[n]


def rerank(alts, words=CAFE_WORDS):
    """Café-vocabulary candidates first; the dictionary's own order breaks ties."""
    order = {a: k for k, a in enumerate(alts)}
    return sorted(dict.fromkeys(alts), key=lambda a: (-cafe_coverage(a, words), order[a]))


def _word_pinyin(word):
    from pypinyin import lazy_pinyin  # toneless, ü written as v (lv for 绿)
    return lazy_pinyin(word)


def build_cafe_index(word_pinyin, words=CAFE_WORDS):
    """{('re','na','tie'): '热拿铁', ...}: café words by their toneless syllables."""
    index = {}
    for w in sorted(words, key=lambda w: (-len(w), w)):
        index.setdefault(tuple(word_pinyin(w)), w)
    return index


def cafe_segment(sylls, index):
    """Cover all syllables with café words (fewest words); the string, or None if impossible."""
    n = len(sylls)
    best = [None] * (n + 1)
    best[0] = []
    for i in range(1, n + 1):
        for j in range(max(0, i - 5), i):
            word = index.get(tuple(sylls[j:i]))
            if best[j] is not None and word:
                cand = best[j] + [word]
                if best[i] is None or len(cand) < len(best[i]):
                    best[i] = cand
    return "".join(best[n]) if best[n] is not None else None


class PinyinConverter:
    """Pinyin -> list of candidate Chinese strings (best first)."""

    def __init__(self, lookup=None, syllables=None, word_pinyin=_word_pinyin):
        # lookup(syllables, n) -> list of candidate strings for one pinyin run
        if lookup is None or syllables is None:
            lookup, syllables = _pinyin2hanzi()
        self.lookup = lookup
        self.valid = set(syllables)
        # café words straight from their pinyin: catches 冰 for 'bing' when the general
        # dictionary ranks rarer characters (宾, 滨...) first
        self.cafe_index = build_cafe_index(word_pinyin) if word_pinyin else {}

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
                    alts = [a for a in self.lookup(sylls, max(n, 10)) if a]
                    cafe = cafe_segment(sylls, self.cafe_index)
                    if cafe:
                        alts.append(cafe)
                    alts = rerank(alts)
                    if not alts:
                        return [], " ".join(sylls)
                    pieces.append(alts)
            else:
                stripped = run.strip()
                if stripped:
                    pieces.append(["".join(PUNCT.get(c, c) for c in stripped)])
        if not pieces:
            return [], ""
        # first: the best of every stretch; then swap one stretch at a time for its next option
        best = [p[0] for p in pieces]
        out = ["".join(best)]
        depth = 1
        while len(out) < n and any(depth < len(p) for p in pieces):
            for i, p in enumerate(pieces):
                if depth < len(p) and len(out) < n:
                    s = "".join(best[:i] + [p[depth]] + best[i + 1:])
                    if s not in out:
                        out.append(s)
            depth += 1
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
