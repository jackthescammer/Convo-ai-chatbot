"""All prompt text lives here and in scenarios.py, so prompt revisions are easy to track.

Bump PROMPT_VERSION whenever any prompt below or any scenario changes; evaluation results
are logged against it.

v7 added the scenarios (convo/scenarios.py). The café prompts are word for word the v6
prompts (tests/test_scenarios.py checks this against tests/golden_cafe_v6.json).
v8 made the shop, restaurant and interview scenarios specifically Chinese (real dishes and phrases,
yuan prices, paying by code or cash). The café is still byte-identical to v6, so the v6 café scores
still describe it; the other scenarios have not been evaluated.
"""

from .scenarios import CAFE, get_scenario

PROMPT_VERSION = "v11"

# The café's values, kept under their v6 names.
CHARACTER_NAME = CAFE.character
DIFFICULTY_RULES = CAFE.style
SURPRISES = CAFE.surprises
OPENING_CUE = CAFE.opening_cue

# Each rule follows "The <learner> is ", e.g. "The customer is a complete beginner ...".
LEVEL_RULES = {
    "A1": (
        "a complete beginner (CEFR A1). Use only very common HSK 1 words and "
        "very short sentences (about 8 characters or fewer). Say one short sentence, two at most. "
        "Present tense only. No idioms, no slang, no rare words."
    ),
    "A2": (
        "an elementary learner (CEFR A2). Use common HSK 1-2 words and short, "
        "simple sentences, two at most per turn. Simple 了, 想, 可以, 要 and 吗/呢 questions are fine. "
        "No idioms and no rare vocabulary."
    ),
}

def chat_format(scenario):
    """The JSON a character turn must come back as (the state's names differ per scenario)."""
    ex = scenario.example
    stages = "|".join(scenario.stages)
    key = scenario.state_key
    return (
        'Reply with ONE JSON object and nothing else, in exactly this format:\n'
        '{"reply": "<what you say, in Simplified Chinese only>", '
        '"english": "<natural English translation of your reply>", '
        f'"state": {{"stage": "<{stages}>", "{key}": ["{scenario.state_hint}"]}}}}\n'
        'Format example (do not copy the words): '
        f'{{"reply": "{ex["reply"]}", "english": "{ex["english"]}", '
        f'"state": {{"stage": "{ex["stage"]}", "{key}": []}}}}'
    )


CHAT_FORMAT = chat_format(CAFE)


def build_system_prompt(settings, surprise=None):
    """System prompt for the scenario's character, adapted to the learner's settings."""
    sc = get_scenario(settings.scenario)
    who = sc.learner
    lines = [
        sc.intro,
        "",
        f"Language level: The {who} is {LEVEL_RULES[settings.level]}",
        f"Style: {sc.style[settings.difficulty]}",
        "",
        "How to behave:",
        '- The "reply" is Simplified Chinese only. Never use English or pinyin inside "reply".',
        f"- {sc.guide}",
        f"- {sc.memory}",
        f"- If the {who} makes a grammar mistake, do not point it out. Work out what they meant "
        "and answer naturally, using the correct form once if it fits.",
        f"- If the {who}'s message is unclear, politely ask what they mean in simple Chinese.",
        "- Never mention being an AI, a model, a teacher or a lesson.",
    ]
    if surprise:
        lines.append(
            f"- For THIS reply only, work this small unexpected situation in naturally: {surprise}. "
            f"Stay in character and let the {who} respond."
        )
    lines += ["", chat_format(sc)]
    return "\n".join(lines)


CATEGORIES = (
    "measure_word",
    "word_order",
    "missing_particle",
    "extra_word",
    "vocabulary",
    "question_structure",
    "negation",
    "unnatural",
    "other",
)


def build_review_prompt(level, scenario=CAFE.id):
    """System prompt for checking ONE learner sentence (teacher role, not the character).

    The worked examples are the same in every scenario: they are the ones the v6 scores were
    measured with, and they show grammar rules rather than scenario words."""
    sc = get_scenario(scenario)
    return "\n".join(
        [
            f"You are a careful Mandarin teacher checking one sentence written by a {level} learner. "
            f"{sc.review_setting}",
            "",
            "Rules:",
            "- Assume the sentence is correct. Report a mistake only if you can name the specific "
            "grammar rule or word that a native speaker would find wrong. When in doubt, answer "
            'has_error false.',
            "- A sentence that is grammatical and natural is correct, even if you can think of a more "
            "polite, longer, more complete or more formal way to say it. Never add, remove or swap "
            f"words in such a sentence. {sc.review_normal} Do not correct punctuation or style, and do not "
            "suggest alternatives for a correct sentence.",
            "- If a sentence is grammatically correct but a native speaker would never say it that way "
            f'{sc.review_unnatural}, report it with category "unnatural".',
            "- If there is a mistake, give the corrected sentence, changing as little as possible.",
            f"- category must be one of: {', '.join(CATEGORIES)} (or \"none\" when there is no mistake).",
            "- explanation: one or two short sentences in English saying what was wrong and why.",
            "- english: the English translation of the corrected sentence.",
            '- If has_error is false, "corrected" must be the original sentence unchanged.',
            "",
            "Reply with ONE JSON object and nothing else:",
            '{"has_error": true or false, "corrected": "...", "category": "...", '
            '"explanation": "...", "english": "..."}',
            "",
            "Examples (different from the sentence you will be given):",
            'Sentence: 我没是学生。',
            '{"has_error": true, "corrected": "我不是学生。", "category": "negation", '
            '"explanation": "是 is negated with 不, not 没. 没 is used for 有 and for past events.", '
            '"english": "I am not a student."}',
            'Sentence: 请问，有没有靠窗的位子？',
            '{"has_error": false, "corrected": "请问，有没有靠窗的位子？", "category": "none", '
            '"explanation": "", "english": "Excuse me, is there a seat by the window?"}',
            'Sentence: 我想喝一块蛋糕。',
            '{"has_error": true, "corrected": "我想吃一块蛋糕。", "category": "vocabulary", '
            '"explanation": "Use 吃 (eat) for food. 喝 (drink) is only for drinks.", '
            '"english": "I would like to eat a piece of cake."}',
            'Sentence: 我要两杯三明治。',
            '{"has_error": true, "corrected": "我要两个三明治。", "category": "measure_word", '
            '"explanation": "杯 (cup) is only for drinks. Sandwiches are counted with 个.", '
            '"english": "I would like two sandwiches."}',
            'Sentence: 我们要结账。',
            '{"has_error": false, "corrected": "我们要结账。", "category": "none", '
            '"explanation": "", "english": "We would like to pay the bill."}',
            'Sentence: 不要冰，谢谢。',
            '{"has_error": false, "corrected": "不要冰，谢谢。", "category": "none", '
            '"explanation": "", "english": "No ice, thanks."}',
            'Sentence: 我们周末再来这家店吃饭。',
            '{"has_error": false, "corrected": "我们周末再来这家店吃饭。", "category": "none", '
            '"explanation": "", "english": "We will come back to this restaurant at the weekend."}',
        ]
    )


def build_verify_prompt(scenario=CAFE.id):
    """Second check, run only when the checker wants to change a sentence.

    Shows the learner's sentence (A) next to the proposed fix (B) and asks which is better.
    """
    return "\n".join(
        [
            f"You are a native Mandarin speaker. {get_scenario(scenario).verify_who} wrote sentence A. "
            "A teacher suggested sentence B instead.",
            "Which one is more correct and natural Chinese? Ignore punctuation. "
            "If they are equally good, answer A.",
            'Reply with ONE JSON object only: {"better": "A"} or {"better": "B"}',
        ]
    )


def build_assessment_prompt(level, stats_text, scenario=CAFE.id):
    """Prompt for the short overall assessment in the feedback report."""
    return "\n".join(
        [
            f"You write short, encouraging feedback for a {level} Mandarin learner after a "
            f"{get_scenario(scenario).roleplay} role-play. Use ONLY the facts below. Do not invent "
            "mistakes or praise anything not listed.",
            "",
            stats_text,
            "",
            "Write 2-3 sentences in English: what went well, and the main thing to practise. "
            'Reply with ONE JSON object only: {"assessment": "..."}',
        ]
    )
