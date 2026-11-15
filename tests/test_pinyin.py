"""Pinyin typing: syllable splitting, tones, punctuation and candidates (no package needed)."""

from convo.pinyin_input import PinyinConverter, split_syllables, strip_tones

SYLLABLES = ["wo", "yao", "yi", "bei", "ka", "fei", "ni", "hao", "xi", "an", "xian", "re", "na",
             "tie", "lv", "cha", "ma", "bing", "zhuang", "a", "e", "ou"]
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


# toneless pinyin for the few café words these tests use (pypinyin does this in the app)
FAKE_PY = {"冰": ["bing"], "一杯": ["yi", "bei"], "咖啡": ["ka", "fei"], "我": ["wo"], "要": ["yao"],
           "热": ["re"], "拿铁": ["na", "tie"], "绿茶": ["lv", "cha"], "吗": ["ma"], "你好": ["ni", "hao"]}


def fake_word_pinyin(word):
    return FAKE_PY.get(word, ["?" + word])


def conv(lookup=fake_lookup):
    return PinyinConverter(lookup=lookup, syllables=SYLLABLES, word_pinyin=fake_word_pinyin)


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
    cands, problem = conv(lambda s, n: []).candidates("xian")  # dictionary has nothing, not a café word
    assert cands == [] and problem == "xian"
    cands, _ = conv().candidates("ni hao? ma")
    assert cands[0] == "你好？吗"
    assert len(cands) == len(set(cands))


def test_cafe_words_reorder_homophones():
    from convo.pinyin_input import rerank
    assert rerank(["我要已被咖啡", "我要一杯咖啡", "我要一倍咖啡"])[0] == "我要一杯咖啡"
    assert rerank(["不要并", "不要病", "不要冰"])[0] == "不要冰"
    assert rerank(["可以刷卡码？", "可以刷卡吗？"])[0] == "可以刷卡吗？"
    # ties keep the dictionary's order
    assert rerank(["先", "现"]) == ["先", "现"]


def test_rerank_only_chooses_between_homophones_so_mistakes_survive():
    # 'chi' is still 吃 even though 喝 is the right verb for coffee: the learner's mistake reaches the report
    lookup = lambda sylls, n: ["我想吃一杯咖啡", "我想持一杯咖啡"]
    c = PinyinConverter(lookup=lookup, syllables=["wo", "xiang", "chi", "yi", "bei", "ka", "fei"],
                        word_pinyin=fake_word_pinyin)
    assert c.candidates("wo xiang chi yi bei kafei")[0][0] == "我想吃一杯咖啡"


def test_one_stretch_varies_at_a_time():
    cands, _ = conv().candidates("ni hao, xian")
    assert cands == ["你好，先", "拟好，先", "你好，现"]


def test_cafe_word_is_offered_even_if_dictionary_misses_it():
    # the general dictionary ranks 宾/滨 for 'bing' and may not list 冰 at all
    c = conv(lambda sylls, n: ["宾", "滨", "缤"] if sylls == ["bing"] else fake_lookup(sylls, n))
    assert c.candidates("bing")[0][:2] == ["冰", "宾"]
    assert c.candidates("wo yao bing")[0][0] == "我要冰"
