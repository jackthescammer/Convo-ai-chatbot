"""Tone feedback for typed pinyin (no pypinyin needed: the right tones are given here)."""

from convo.pinyin_feedback import tone_feedback, typed_tones

VALID = {"wo", "yao", "ni", "hao", "ka", "fei", "yi", "bei", "ma", "bu", "he", "cha"}
TONES = {
    "我要咖啡": [("我", "wǒ", 3), ("要", "yào", 4), ("咖", "kā", 1), ("啡", "fēi", 1)],
    "你好吗": [("你", "nǐ", 3), ("好", "hǎo", 3), ("吗", "ma", 5)],
    "一杯": [("一", "yì", 4), ("杯", "bēi", 1)],
}
fake = lambda s: TONES[s]


def test_no_tones_at_all():
    r = tone_feedback("wo yao kafei", "我要咖啡", VALID, fake)
    assert r["status"] == "none" and r["expected"] == "wǒ yào kā fēi"


def test_all_tones_right_with_marks_and_numbers():
    assert tone_feedback("wǒ yào kāfēi", "我要咖啡", VALID, fake)["status"] == "ok"
    assert tone_feedback("wo3 yao4 ka1 fei1", "我要咖啡", VALID, fake)["status"] == "ok"


def test_a_wrong_tone_is_named():
    r = tone_feedback("wo2 yao4 ka1 fei1", "我要咖啡", VALID, fake)
    assert r["status"] == "partial"
    assert r["wrong"] == [{"char": "我", "typed": "wo2", "expected": "wǒ"}]


def test_some_missing():
    r = tone_feedback("wǒ yao kāfēi", "我要咖啡", VALID, fake)
    assert r["status"] == "partial" and r["missing"] == 1 and r["wrong"] == []


def test_neutral_tone_needs_no_mark():
    assert tone_feedback("nǐ hǎo ma", "你好吗", VALID, fake)["status"] == "ok"


def test_yi_tone_change_is_accepted_either_way():
    assert tone_feedback("yī bēi", "一杯", VALID, fake)["status"] == "ok"
    assert tone_feedback("yì bēi", "一杯", VALID, fake)["status"] == "ok"


def test_unalignable_input_still_shows_the_right_pinyin():
    r = tone_feedback("wǒ yào", "我要咖啡", VALID, fake)  # fewer syllables than characters
    assert r["status"] == "check" and r["expected"] == "wǒ yào kā fēi"


def test_typed_tones_splits_marked_words():
    assert typed_tones("kāfēi", VALID) == [("kā", 1), ("fēi", 1)]
    assert typed_tones("xyz", VALID) is None
