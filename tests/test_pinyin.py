"""Pinyin typing: syllable splitting, tones, punctuation and candidates (no package needed)."""

from convo.pinyin_input import PinyinConverter, split_syllables, strip_tones

SYLLABLES = ["wo", "yao", "yi", "bei", "ka", "fei", "ni", "hao", "xi", "an", "xian", "re", "na",
             "tie", "lv", "cha", "ma", "zhuang", "a", "e", "ou"]
WORDS = {
    ("wo", "yao", "yi", "bei", "ka", "fei"): ["我要一杯咖啡", "我要一被咖啡"],
    ("ni", "hao"): ["你好", "拟好"],
    ("re", "na", "tie"): ["热拿铁"],
    ("lv", "cha"): ["绿茶"],
    ("xian",): ["先", "现"],
    ("xi", "an"): ["西安"],
    ("ma",): ["吗", "妈"],
}


def fake_lookup(sylls, n):
    return WORDS.get(tuple(sylls), [])[:n]


def conv():
    return PinyinConverter(lookup=fake_lookup, syllables=SYLLABLES)


def test_strip_tones_marks_numbers_and_umlaut():
    assert strip_tones("Nǐ hǎo").split() == ["ni", "hao"]
    assert strip_tones("ni3 hao3").split() == ["ni", "hao"]
    assert strip_tones("lǜchá").split() == ["lvcha"]
    assert strip_tones("lu:cha").split() == ["lvcha"]


def test_split_syllables_prefers_fewest():
    valid = set(SYLLABLES)
    assert split_syllables("kafei", valid) == ["ka", "fei"]
    assert split_syllables("xian", valid) == ["xian"]
    assert split_syllables("kafie", valid) is None


def test_candidates_spaces_or_joined_give_same_result():
    c = conv()
    assert c.candidates("wo yao yi bei kafei")[0][0] == "我要一杯咖啡"
    assert c.candidates("woyaoyibeikafei")[0][0] == "我要一杯咖啡"
    assert c.candidates("wǒ yào yì bēi kāfēi")[0][0] == "我要一杯咖啡"


def test_alternatives_are_offered():
    cands, problem = conv().candidates("ni hao")
    assert problem == ""
    assert cands == ["你好", "拟好"]


def test_apostrophe_splits_syllables():
    assert conv().candidates("xi'an")[0] == ["西安"]
    assert conv().candidates("xian")[0][0] == "先"


def test_punctuation_becomes_chinese_and_chinese_is_kept():
    cands, _ = conv().candidates("ni hao, wo yao yi bei kafei.")
    assert cands[0] == "你好，我要一杯咖啡。"
    cands, _ = conv().candidates("我要 re na tie")
    assert cands[0] == "我要热拿铁"
    cands, _ = conv().candidates("lǜ chá?")
    assert cands[0] == "绿茶？"


def test_bad_spelling_is_reported_not_guessed():
    cands, problem = conv().candidates("wo yao kafie")
    assert cands == []
    assert problem == "kafie"


def test_empty_input():
    assert conv().candidates("   ") == ([], "")


def test_candidate_k_mixes_alternatives_without_duplicates():
    cands, problem = conv().candidates("ni hao ma")  # dictionary has nothing for this run
    assert cands == [] and problem == "ni hao ma"
    cands, _ = conv().candidates("ni hao? ma")
    assert cands[0] == "你好？吗"
    assert len(cands) == len(set(cands))
