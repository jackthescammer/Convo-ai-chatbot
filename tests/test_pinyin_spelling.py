"""Spelling help for typed pinyin (no packages needed: a small fake converter)."""

from convo.pinyin_spelling import spelling_feedback, suggest, why_not_pinyin

VALID = {"wo", "yao", "yi", "yin", "ye", "ao", "ge", "bing", "cha", "ni", "hao", "niao", "ka", "fei",
         "xie", "er", "bei"}
CAFE_INDEX = {("wo",): "我", ("yao",): "要", ("yi",): "一", ("yi", "ge"): "一个", ("ye",): "也",
              ("bing",): "冰", ("cha",): "茶", ("ni", "hao"): "你好", ("ka", "fei"): "咖啡",
              ("xie", "xie"): "谢谢", ("yi", "bei"): "一杯"}
CHARS = {"yao": "要", "yi": "一"}


class Conv:
    valid = VALID
    cafe_index = CAFE_INDEX

    def candidates(self, text, n=5):
        return ([CHARS[text]] if text in CHARS else []), ""


def test_not_pinyin_gets_a_suggestion_and_a_reason():
    r = spelling_feedback("wo yao yir ge bing cha", Conv())
    assert r["issues"] == [{"typed": "yir", "suggest": "yi", "char": "一",
                            "reason": "only 'er' ends in r in pinyin; other syllables end in a vowel, n or ng"}]
    assert r["fixed"] == "wo yao yi ge bing cha"


def test_odd_split_is_flagged():
    r = spelling_feedback("wo yeao yi ge bing cha", Conv())
    assert [(i["typed"], i["suggest"], i["char"]) for i in r["issues"]] == [("yeao", "yao", "要")]
    assert "ye + ao" in r["issues"][0]["reason"]
    assert r["fixed"] == "wo yao yi ge bing cha"


def test_both_mistakes_are_reported():
    r = spelling_feedback("wo yeao yir ge bing cha", Conv())
    assert [i["typed"] for i in r["issues"]] == ["yeao", "yir"]


def test_real_words_are_left_alone():
    for text in ("ni hao", "nihao", "kafei", "xiexie", "wo yao yi bei bing cha"):
        r = spelling_feedback(text, Conv())
        assert r["issues"] == [] and r["fixed"] == text, text


def test_reasons_and_suggestions():
    assert "end in a vowel" in why_not_pinyin("wok")
    assert suggest("yir", VALID, {"yi": 3}) == "yi"
