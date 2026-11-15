"""Convo AI web app (Gradio): onboarding -> conversation (café, shop, restaurant, job interview
or open chat) -> learning report.

    from app import build_app
    build_app(backend).launch(share=True)

API used by the website (app/js/model.js), all under one session_hash per conversation:
    /start_scenario  [level, difficulty, display, scenario]   opens a conversation
    /send            [message, chat]                          one learner message
    /finish          []                                       the report (Markdown)
    /check_scenario  [text, level, scenario]                  live feedback on one message
/start and /check are the same without the scenario (always the café). They stay so that a
website from before scenarios keeps working: Gradio rejects calls with a missing input.
"""

import re

import gradio as gr

from convo.chat import Conversation
from convo.prompts import PROMPT_VERSION
from convo.pinyin_feedback import tone_feedback
from convo.pinyin_spelling import looks_like_english, spelling_feedback
from convo.render import format_turn, to_pinyin
from convo.review import CATEGORY_LABELS, build_report, review_sentence
from convo.scenarios import DEFAULT_SCENARIO, SCENARIOS
from convo.settings import DIFFICULTIES, LEVELS, Settings
from convo.structured import HAN
from convo.turn_check import judge_turn

DISPLAY_CHOICES = [("Chinese characters", "chinese"), ("Pinyin", "pinyin"), ("English", "english")]
SCENARIO_CHOICES = [(sc.title, sc.id) for sc in SCENARIOS.values()]

CSS = """
#chat .message, #chat .prose { font-size: 1.15rem; line-height: 1.7; }
#chat .message, #chat .prose, #report { font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif; }
.gradio-container { max-width: 760px !important; margin: auto; }
"""


def _hidden(visible):
    """Show/hide update that works on Gradio 4, 5 and 6."""
    if hasattr(gr, "update"):
        return gr.update(visible=visible)
    return gr.Column(visible=visible)


def _make_blocks():
    """Gradio 6 moved css/theme from gr.Blocks() to launch(); support both."""
    theme = gr.themes.Base(neutral_hue="slate")
    try:
        return gr.Blocks(title="Convo AI", css=CSS, theme=theme), {}
    except TypeError:
        return gr.Blocks(title="Convo AI"), {"css": CSS, "theme": theme}


def _make_chatbot(**kwargs):
    """Gradio 4/5 need type="messages"; Gradio 6 uses that format by default and rejects `type`."""
    try:
        return gr.Chatbot(type="messages", **kwargs)
    except TypeError:
        return gr.Chatbot(**kwargs)


_HAN_CHAR = re.compile(r"[\u4e00-\u9fff]")
_LATIN = re.compile(r"[A-Za-z]")


def mostly_chinese(text):
    """More Chinese than English. An English explanation may still quote a Chinese sentence."""
    return len(_HAN_CHAR.findall(text or "")) * 2 > len(_LATIN.findall(text or ""))


def english_explanation(backend, explanation, sentence, corrected):
    """The checker sometimes explains in Chinese, which an A2 learner can't read. Ask for a short
    English version for display only; the correction itself and the scored checker don't change."""
    if not explanation or not mostly_chinese(explanation):
        return explanation
    raw = backend.generate([
        {"role": "system", "content": "You explain Chinese grammar to beginners. Rewrite the explanation "
                                      "in simple English in one or two sentences. Keep Chinese words only "
                                      "when quoting them. Reply with the English explanation only."},
        {"role": "user", "content": f"Learner wrote: {sentence}\nCorrected: {corrected}\nExplanation: {explanation}"},
    ], max_new_tokens=120, temperature=0.0).strip()
    # keep the original if the rewrite is empty or still mostly Chinese
    return raw if raw and not mostly_chinese(raw) else explanation


def is_english(pinyin, text):
    """True for a message written in English (no Chinese characters, and it doesn't read as pinyin)."""
    text = (text or "").strip()
    return (bool(text) and pinyin is not None and not HAN.search(text)
            and looks_like_english(text, pinyin))


def as_characters(pinyin, text):
    """The message as Chinese characters if it was typed in pinyin (spelling fixed first), else as is."""
    text = (text or "").strip()
    if HAN.search(text) or pinyin is None or not text or is_english(pinyin, text):
        return text
    try:
        fixed = spelling_feedback(text, pinyin)["fixed"] if getattr(pinyin, "valid", None) else text
        cands, _ = pinyin.candidates(fixed)
        return cands[0] if cands and HAN.search(cands[0]) else text
    except Exception:
        return text


def check_message(backend, pinyin, text, level="A2", pinyin_fn=to_pinyin, scenario=DEFAULT_SCENARIO,
                  context=""):
    """Live feedback on one message, plus (with `context`, the character's last line) whether it
    answered that line. See _check_message for the language feedback."""
    out = _check_message(backend, pinyin, text, level, pinyin_fn, scenario)
    if out.get("language") == "english":
        # no model call needed: a reply in English is off script whatever it says
        out["turn"] = {"kind": "not_mandarin", "note": "Try saying it in Mandarin, in Chinese characters or pinyin."}
        return out
    if context:
        try:
            sc = SCENARIOS.get(scenario) or SCENARIOS[DEFAULT_SCENARIO]
            verdict = judge_turn(backend, sc, context, out.get("checked") or as_characters(pinyin, text))
            if verdict["kind"] != "answer":
                out["turn"] = verdict
        except Exception as exc:  # the turn check is extra; never lose the language feedback over it
            print("[convo] turn check skipped:", exc)
    return out


def _check_message(backend, pinyin, text, level="A2", pinyin_fn=to_pinyin, scenario=DEFAULT_SCENARIO):
    """Live feedback on one message, from the same checker as the report and the scored tests
    (convo/review.py is unchanged). Pinyin is read as its best character candidate first, so a
    learner typing pinyin gets checked too. Speech can use this as well once it is transcribed."""
    text = (text or "").strip()
    level = level if level in LEVELS else "A2"
    scenario = scenario if scenario in SCENARIOS else DEFAULT_SCENARIO
    out = {"original": text, "checked": "", "from_pinyin": False, "skipped": ""}
    if is_english(pinyin, text):
        # English isn't misspelt pinyin: don't "correct" it into random characters
        out["language"] = "english"
        out["skipped"] = "That's English, so there's nothing to correct. Reply in Mandarin: Chinese characters or pinyin."
        return out
    if HAN.search(text):
        sentence = text
    elif pinyin is not None and text:
        # fix misspelt words first (and say why), so the rest of the sentence still gets checked
        spell = {"issues": [], "fixed": text}
        if getattr(pinyin, "valid", None):
            try:
                spell = spelling_feedback(text, pinyin)
            except Exception as exc:
                print("[convo] spelling help skipped:", exc)
        out["spelling"] = spell["issues"]
        cands, problem = pinyin.candidates(spell["fixed"])
        if not cands or not HAN.search(cands[0]):  # e.g. only punctuation: nothing to check
            out["skipped"] = (f"We couldn't read '{problem}' as pinyin." if problem
                              else "Write in Chinese characters or pinyin to get feedback.")
            return out
        # shortcut: takes the top pinyin candidate; if it guesses the wrong characters, the check is of that guess
        sentence, out["from_pinyin"] = cands[0], True
    else:
        out["skipped"] = "Write in Chinese characters or pinyin to get feedback."
        return out
    r = review_sentence(backend, sentence, level, scenario=scenario)
    out.update(checked=sentence, valid=r.valid, has_error=bool(r.valid and r.has_error),
               corrected=r.corrected if r.valid and r.has_error else "",
               corrected_pinyin=pinyin_fn(r.corrected) if r.valid and r.has_error and r.corrected else "",
               checked_pinyin=pinyin_fn(sentence) if out["from_pinyin"] else "",
               category=r.category, label=CATEGORY_LABELS.get(r.category, ""),
               explanation=english_explanation(backend, r.explanation, sentence, r.corrected)
               if r.valid and r.has_error else r.explanation,
               english=r.english)
    if out["from_pinyin"] and getattr(pinyin, "valid", None):
        try:  # tone marks the learner typed vs the right ones; display only, never blocks the check
            out["tones"] = tone_feedback(spell["fixed"], sentence, pinyin.valid)
        except Exception as exc:  # e.g. pypinyin missing
            print("[convo] tone feedback skipped:", exc)
    # "Try saying": the whole sentence done right, whenever something needed fixing
    if r.valid and (out["has_error"] or out.get("spelling")):
        better = out["corrected"] or sentence
        try:
            better_py = pinyin_fn(better)
        except Exception:
            better_py = ""
        out["example"] = {"zh": better, "py": better_py, "en": r.english}
    return out


def build_app(backend, pinyin="auto"):
    """`pinyin`: a PinyinConverter, None to turn pinyin typing off, or "auto" to load the default."""
    if pinyin == "auto":
        from convo.pinyin_input import load_pinyin_converter
        pinyin = load_pinyin_converter()

    def convert_pinyin(text):
        """Pinyin box -> candidate list, the top candidate in the message box, and a note."""
        cands, problem = pinyin.candidates(text)
        if problem:
            note = f"*'{problem}' isn't pinyin yet: keep typing, or check the spelling.*"
            return gr.Radio(choices=[], value=None, visible=False), gr.Textbox(value=""), note
        if not cands:
            return gr.Radio(choices=[], value=None, visible=False), gr.Textbox(value=""), ""
        return (gr.Radio(choices=cands, value=cands[0], visible=True), gr.Textbox(value=cands[0]),
                "*Check the characters, then press **Send**.*")

    def clear_pinyin():
        return gr.Textbox(value=""), gr.Radio(choices=[], value=None, visible=False), ""

    def start(level, difficulty, display, scenario=DEFAULT_SCENARIO):
        if not display:
            gr.Warning("Pick at least one display option; showing Chinese characters.")
            display = ["chinese"]
        if scenario not in SCENARIOS:
            raise gr.Error(f"Unknown scenario {scenario!r}. Choose one of: {', '.join(SCENARIOS)}.")
        conv = Conversation(backend, Settings(level=level, difficulty=difficulty, display=tuple(display),
                                              scenario=scenario), turn_check=True)
        turn = conv.start()
        chat = [{"role": "assistant", "content": format_turn(turn.reply, turn.english, conv.settings.display)}]
        sc = conv.scenario
        title = f"### {sc.title}\n{sc.character} · {sc.role}"
        return (conv, chat, _hidden(False), _hidden(True), _hidden(False), title)

    def start_cafe(level, difficulty, display):
        """/start, as before scenarios existed (always the café)."""
        return start(level, difficulty, display, DEFAULT_SCENARIO)

    def send(message, chat, conv):
        message = (message or "").strip()
        if conv is None or not message:
            return "", chat, conv
        chat = chat + [{"role": "user", "content": message}]
        turn = conv.send(message, judge_text=as_characters(pinyin, message),
                         not_mandarin=is_english(pinyin, message))
        chat = chat + [{"role": "assistant",
                        "content": format_turn(turn.reply, turn.english, conv.settings.display)}]
        return "", chat, conv

    def finish(conv):
        if conv is None:
            keep = gr.update() if hasattr(gr, "update") else None
            return keep, keep, keep
        report = build_report(backend, conv.learner_sentences, conv.settings)
        return report.to_markdown(), _hidden(False), _hidden(True)

    def restart():
        return None, [], _hidden(True), _hidden(False), _hidden(False)

    blocks, launch_extras = _make_blocks()
    with blocks as app:
        conv_state = gr.State(None)
        gr.Markdown("# Convo AI\nLearn Mandarin by having a conversation, not by memorising.")

        with gr.Column(visible=True) as onboarding:
            gr.Markdown("### Set up your practice")
            scenario = gr.Radio(SCENARIO_CHOICES, value=DEFAULT_SCENARIO, label="Conversation")
            level = gr.Radio(list(LEVELS), value="A2", label="Your level")
            difficulty = gr.Radio(list(DIFFICULTIES), value="Standard", label="Conversation difficulty")
            display = gr.CheckboxGroup(DISPLAY_CHOICES, value=["chinese", "pinyin"],
                                       label="Show the waiter's words as")
            start_btn = gr.Button("Start conversation", variant="primary")

        with gr.Column(visible=False) as chat_view:
            chat_title = gr.Markdown()
            chatbot = _make_chatbot(height=420, elem_id="chat", label="Conversation")
            msg = gr.Textbox(placeholder="Type your reply in Chinese, then press Enter",
                             show_label=False, autofocus=True)
            # Windows voice typing is an OS feature: it types into the box above like a keyboard.
            gr.Markdown("<small>**Speak instead (Windows):** switch the keyboard to Chinese "
                        "(Win + Space), click the reply box, press **Win + H** and talk. "
                        "Check the characters, then send.</small>")
            if pinyin is not None:
                send_btn = gr.Button("Send", variant="primary")
                with gr.Accordion("No Chinese keyboard? Type in pinyin", open=True):
                    pin_in = gr.Textbox(placeholder="e.g. wo yao yi bei kafei (tones optional)",
                                        show_label=False)
                    pin_pick = gr.Radio(choices=[], label="Which characters do you mean?",
                                        visible=False)
                    pin_note = gr.Markdown("")
            end_btn = gr.Button("End conversation and get my report")

        with gr.Column(visible=False) as report_view:
            report_md = gr.Markdown(elem_id="report")
            again_btn = gr.Button("Start a new conversation", variant="primary")

        # Hidden: the website calls this as the "check" API after every message it sends.
        with gr.Column(visible=False):
            check_text = gr.Textbox()
            check_level = gr.Textbox(value="A2")
            check_scenario = gr.Textbox(value=DEFAULT_SCENARIO)
            check_out = gr.JSON()
            check_btn = gr.Button()
            check_scenario_btn = gr.Button()
            check_context = gr.Textbox()
            check_turn_btn = gr.Button()
            start_cafe_btn = gr.Button()
        check_btn.click(lambda text, lvl: check_message(backend, pinyin, text, lvl),
                        [check_text, check_level], check_out, api_name="check")
        check_scenario_btn.click(lambda text, lvl, sc: check_message(backend, pinyin, text, lvl, scenario=sc),
                                 [check_text, check_level, check_scenario], check_out, api_name="check_scenario")
        # check_turn: also says whether the message answered the character's last line (context)
        check_turn_btn.click(lambda text, lvl, sc, ctx: check_message(backend, pinyin, text, lvl, scenario=sc,
                                                                      context=ctx),
                             [check_text, check_level, check_scenario, check_context], check_out,
                             api_name="check_turn")

        gr.Markdown(f"<small>Model: {backend.name} · prompts {PROMPT_VERSION} · "
                    "Prototype: answers can be wrong.</small>")

        start_outputs = [conv_state, chatbot, onboarding, chat_view, report_view, chat_title]
        start_btn.click(start, [level, difficulty, display, scenario], start_outputs, api_name="start_scenario")
        start_cafe_btn.click(start_cafe, [level, difficulty, display], start_outputs, api_name="start")
        sent = msg.submit(send, [msg, chatbot, conv_state], [msg, chatbot, conv_state])
        if pinyin is not None:
            # always_last: keystrokes typed while a lookup runs are not dropped (default "once" drops them)
            pin_in.input(convert_pinyin, [pin_in], [pin_pick, msg, pin_note], trigger_mode="always_last")
            pin_pick.input(lambda choice: choice or "", [pin_pick], [msg])
            sent.then(clear_pinyin, None, [pin_in, pin_pick, pin_note])
            send_btn.click(send, [msg, chatbot, conv_state], [msg, chatbot, conv_state]).then(
                clear_pinyin, None, [pin_in, pin_pick, pin_note])
        end_btn.click(finish, [conv_state], [report_md, chat_view, report_view])
        again_btn.click(restart, None, [conv_state, chatbot, onboarding, chat_view, report_view])
    if launch_extras:  # Gradio 6: pass css/theme at launch time
        original_launch = app.launch

        def launch(*args, **kwargs):
            return original_launch(*args, **{**launch_extras, **kwargs})

        app.launch = launch
    return app


if __name__ == "__main__":
    from convo.backends import load_backend

    build_app(load_backend()).launch()
