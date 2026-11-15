"""Scenarios: the café is unchanged from v6, and every other scenario fills the same slots."""

import json
import unittest
from pathlib import Path

from convo import Settings
from convo.chat import Conversation
from convo.prompts import (build_assessment_prompt, build_review_prompt, build_system_prompt,
                           build_verify_prompt)
from convo.review import CATEGORY_TIPS, build_report
from convo.scenarios import CAFE, SCENARIOS, get_scenario
from fakes import FakeBackend, review_json

GOLDEN = json.loads((Path(__file__).parent / "golden_cafe_v6.json").read_text(encoding="utf-8"))
LEVELS = ("A1", "A2")
DIFFICULTIES = ("Easy", "Standard", "Challenging")
OTHERS = [sc for sc in SCENARIOS.values() if sc.id != "cafe"]


def turn(reply="好的。", english="OK.", stage=None, key="order", items=()):
    state = {key: list(items)}
    if stage:
        state["stage"] = stage
    return json.dumps({"reply": reply, "english": english, "state": state}, ensure_ascii=False)


class CafeIsUnchangedFromV6(unittest.TestCase):
    """The v6 scores in results/VERSIONS.md were measured on these exact prompts."""

    def test_every_cafe_system_prompt(self):
        for lvl in LEVELS:
            for d in DIFFICULTIES:
                for i, surprise in enumerate((None,) + CAFE.surprises):
                    with self.subTest(level=lvl, difficulty=d, surprise=i):
                        self.assertEqual(build_system_prompt(Settings(level=lvl, difficulty=d), surprise),
                                         GOLDEN["system"][f"{lvl}|{d}|{i}"])

    def test_cafe_review_verify_and_assessment(self):
        self.assertEqual(build_verify_prompt(), GOLDEN["verify"])
        for lvl in LEVELS:
            self.assertEqual(build_review_prompt(lvl), GOLDEN["review"][lvl])
            self.assertEqual(build_assessment_prompt(lvl, "Sentences checked: 2. Sentences with mistakes: 1."),
                             GOLDEN["assessment"][lvl])

    def test_cafe_opening_and_surprises(self):
        self.assertEqual(CAFE.opening_cue, GOLDEN["opening_cue"])
        self.assertEqual(list(CAFE.surprises), GOLDEN["surprises"])
        self.assertEqual(Settings().scenario, "cafe")


class EveryScenario(unittest.TestCase):
    def test_ids_and_lookup(self):
        self.assertEqual(set(SCENARIOS), {"cafe", "shop", "restaurant", "interview", "chat"})
        with self.assertRaises(ValueError):
            get_scenario("airport")
        with self.assertRaises(ValueError):
            Settings(scenario="airport")

    def test_system_prompts_define_character_level_and_format(self):
        for sc in SCENARIOS.values():
            for lvl in LEVELS:
                for d in DIFFICULTIES:
                    with self.subTest(scenario=sc.id, level=lvl, difficulty=d):
                        p = build_system_prompt(Settings(level=lvl, difficulty=d, scenario=sc.id))
                        for needle in (sc.character, "not a teacher", "Simplified Chinese", "JSON",
                                       f'"{sc.state_key}"', "|".join(sc.stages), f"CEFR {lvl}",
                                       sc.style[d]):
                            self.assertIn(needle, p)
                        self.assertNotIn("{", sc.intro + sc.guide + sc.memory)

    def test_other_scenarios_never_mention_the_cafe(self):
        for sc in OTHERS:
            with self.subTest(scenario=sc.id):
                text = " ".join([build_system_prompt(Settings(scenario=sc.id), sc.surprises[0]),
                                 build_review_prompt("A2", sc.id), build_verify_prompt(sc.id),
                                 build_assessment_prompt("A2", "x", sc.id), *sc.tips.values()])
                self.assertNotIn("café", text)
                self.assertNotIn("waiter", text)

    def test_review_prompt_keeps_the_rules_and_examples(self):
        cafe = build_review_prompt("A2")
        examples = [l for l in cafe.splitlines() if l.startswith(("Sentence:", "{"))]
        for sc in OTHERS:
            with self.subTest(scenario=sc.id):
                p = build_review_prompt("A2", sc.id)
                self.assertIn(sc.review_setting, p)
                self.assertIn(sc.review_normal, p)
                for needle in ("Assume the sentence is correct", "When in doubt", "Never add, remove or swap",
                               "changing as little as possible"):
                    self.assertIn(needle, p)
                for line in examples:  # same worked examples as v6
                    self.assertIn(line, p)

    def test_verify_prompt_is_still_recognisable(self):
        for sc in SCENARIOS.values():  # FakeBackend and ui_stub_app spot the second check by this start
            self.assertTrue(build_verify_prompt(sc.id).startswith("You are a native Mandarin speaker"))

    def test_scenario_tips_only_replace_known_categories(self):
        for sc in SCENARIOS.values():
            self.assertLessEqual(set(sc.tips), set(CATEGORY_TIPS))


class ScenarioConversations(unittest.TestCase):
    def test_state_list_uses_the_scenario_key(self):
        replies = iter([turn("您好，您想买什么？", "Hi, what would you like?", "browsing", "basket"),
                        turn("好的，两瓶水。还要别的吗？", "Two waters. Anything else?", "choosing", "basket", ["两瓶水"])])
        fake = FakeBackend(lambda m: next(replies))
        conv = Conversation(fake, Settings(scenario="shop", difficulty="Easy"))
        conv.start()
        t = conv.send("我要两瓶水。")
        self.assertEqual((t.stage, t.order), ("choosing", ["两瓶水"]))
        stored = json.loads(conv.history[-1]["content"])
        self.assertEqual(stored["state"], {"stage": "choosing", "basket": ["两瓶水"]})
        self.assertIn('"basket"', fake.calls[-1][0]["content"])

    def test_stage_from_another_scenario_is_ignored(self):
        fake = FakeBackend(lambda m: turn(stage="ordering", key="facts", items=["学生"]))
        conv = Conversation(fake, Settings(scenario="interview"))
        t = conv.start()
        self.assertEqual(t.stage, "greeting")   # "ordering" is a café stage, not an interview one
        self.assertEqual(t.order, ["学生"])

    def test_open_chat_picks_a_topic_for_the_opening(self):
        sc = get_scenario("chat")
        seen = set()
        for seed in range(20):
            fake = FakeBackend(lambda m: turn(key="facts"))
            Conversation(fake, Settings(scenario="chat"), seed=seed).start()
            cue = fake.calls[0][-1]["content"]
            self.assertNotIn("{topic}", cue)
            topic = next(t for t in sc.topics if t in cue)
            seen.add(topic)
        self.assertGreater(len(seen), 3)    # the opening varies

    def test_open_chat_opening_is_reproducible_with_a_seed(self):
        def cue(seed):
            fake = FakeBackend(lambda m: turn(key="facts"))
            Conversation(fake, Settings(scenario="chat"), seed=seed).start()
            return fake.calls[0][-1]["content"]
        self.assertEqual(cue(5), cue(5))

    def test_cafe_opening_does_not_use_the_random_generator(self):
        fake = FakeBackend(lambda m: turn())
        conv = Conversation(fake, Settings(), seed=3)
        state = conv.rng.getstate()
        conv.start()
        self.assertEqual(conv.rng.getstate(), state)  # café surprise sequences stay as in v6

    def test_surprises_come_from_the_scenario(self):
        for sc in OTHERS:
            with self.subTest(scenario=sc.id):
                fake = FakeBackend(lambda m: turn(key=sc.state_key))
                conv = Conversation(fake, Settings(scenario=sc.id, difficulty="Challenging"), seed=1)
                conv.start()
                for _ in range(12):
                    conv.send("好的")
                used = [s for s in sc.surprises if any(s in c[0]["content"] for c in fake.calls)]
                cafe_only = [s for s in CAFE.surprises if s not in sc.surprises]
                cafe_used = [s for s in cafe_only if any(s in c[0]["content"] for c in fake.calls)]
                self.assertTrue(used)
                self.assertFalse(cafe_used)


class ScenarioReports(unittest.TestCase):
    def test_report_checks_sentences_in_the_scenario(self):
        fake = FakeBackend(lambda m: review_json(True, "我会说两门语言。", "measure_word",
                                                 "Languages take 门.", "I speak two languages."),
                           verify='{"better": "B"}')
        report = build_report(fake, ["我会说两个语言。"], Settings(scenario="interview"), pinyin_fn=lambda s: "py")
        review_prompt = fake.calls[0][0]["content"]
        verify_prompt = next(c[0]["content"] for c in fake.calls if c[0]["content"].startswith("You are a native"))
        self.assertIn(get_scenario("interview").review_setting, review_prompt)
        self.assertIn("job interview", verify_prompt)
        self.assertIn("job interview role-play", fake.calls[-1][0]["content"])  # the assessment
        self.assertEqual(report.scenario, "interview")
        self.assertIn(get_scenario("interview").tips["measure_word"], report.suggestions)

    def test_empty_report_names_the_character(self):
        report = build_report(FakeBackend(lambda m: ""), ["hello"], Settings(scenario="restaurant"))
        self.assertIn("answer the server in Chinese", report.to_markdown())
        report = build_report(FakeBackend(lambda m: ""), ["hello"], Settings())
        self.assertIn("answer the waiter in Chinese", report.to_markdown())


class AppEndpoints(unittest.TestCase):
    """The website's calls. /start and /check must keep their inputs: Gradio rejects a missing one."""

    def setUp(self):
        try:
            import gradio  # noqa: F401
        except ImportError:
            self.skipTest("gradio is not installed")

    def test_scenario_endpoints_and_old_ones_unchanged(self):
        from app import build_app
        app = build_app(FakeBackend(lambda m: turn()), pinyin=None)
        inputs = {d.api_name: len(d.inputs) for d in app.fns.values() if d.api_name}
        self.assertEqual(inputs["start"], 3)
        self.assertEqual(inputs["start_scenario"], 4)
        self.assertEqual(inputs["check"], 2)
        self.assertEqual(inputs["check_scenario"], 3)

    def test_check_message_uses_the_scenario(self):
        from app import check_message
        fake = FakeBackend(lambda m: review_json(False, "多少钱？", "none", "", "How much?"))
        check_message(fake, None, "多少钱？", "A2", pinyin_fn=lambda s: s, scenario="shop")
        self.assertIn("shop assistant", fake.calls[0][0]["content"])
        fake = FakeBackend(lambda m: review_json(False, "多少钱？", "none", "", "How much?"))
        check_message(fake, None, "多少钱？", "A2", pinyin_fn=lambda s: s, scenario="nonsense")
        self.assertIn("café", fake.calls[0][0]["content"])  # unknown -> the café, as /check does


class ScenarioEvaluation(unittest.TestCase):
    def test_every_scenario_has_conversation_scripts(self):
        from convo.evaluation import CONVERSATION_SCRIPTS, PROBE, SCENARIO_SCRIPTS
        self.assertEqual(set(SCENARIO_SCRIPTS), set(SCENARIOS))
        self.assertIs(SCENARIO_SCRIPTS["cafe"], CONVERSATION_SCRIPTS)  # café results stay comparable
        self.assertTrue(all("probe" not in s for s in CONVERSATION_SCRIPTS))
        for sid, scripts in SCENARIO_SCRIPTS.items():
            for s in scripts:
                with self.subTest(scenario=sid, script=s["name"]):
                    said = "".join(s["turns"])
                    for item in s["items"]:
                        self.assertIn(item, said)   # only ask about what the learner really said
                    self.assertTrue(s.get("probe", PROBE).endswith("？"))

    def test_conversation_eval_runs_for_a_scenario(self):
        from convo.evaluation import run_conversation_eval
        fake = FakeBackend(lambda m: turn("你好，安娜！", "Hi Anna!", "introduction", "facts", ["安娜", "大学生"]))
        result = run_conversation_eval(fake, Settings(scenario="interview"))
        self.assertEqual(result["metrics"]["scenario"], "interview")
        self.assertEqual(result["metrics"]["n_scripts"], 3)
        first = result["transcripts"][0]
        self.assertEqual(first["dialogue"][-1]["learner"], "您还记得我的名字吗？")
        self.assertTrue(first["context_retained"])


if __name__ == "__main__":
    unittest.main()
