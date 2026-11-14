"""Convo AI web app (Gradio): onboarding -> café conversation -> learning report.

    from app import build_app
    build_app(backend).launch(share=True)
"""

import gradio as gr

from convo.chat import Conversation
from convo.prompts import PROMPT_VERSION
from convo.render import format_turn
from convo.review import build_report
from convo.settings import DIFFICULTIES, LEVELS, Settings

DISPLAY_CHOICES = [("Chinese characters", "chinese"), ("Pinyin", "pinyin"), ("English", "english")]

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


def build_app(backend, transcriber=None):
    """`transcriber` (optional, see convo/speech.py) adds a microphone: speak, check the text, send."""

    def heard(audio_path, current):
        """Speech -> editable text. The learner checks it and presses Enter to send."""
        if not audio_path:
            return current, None
        t = transcriber.transcribe(audio_path)
        if not t.text:
            gr.Warning("Sorry, I didn't catch that. Try again, a little closer to the mic.")
            return current, None
        if not t.has_chinese:
            gr.Info("That didn't sound like Chinese. Check the text before sending.")
        return t.text, None

    def start(level, difficulty, display):
        if not display:
            gr.Warning("Pick at least one display option; showing Chinese characters.")
            display = ["chinese"]
        conv = Conversation(backend, Settings(level=level, difficulty=difficulty, display=tuple(display)))
        turn = conv.start()
        chat = [{"role": "assistant", "content": format_turn(turn.reply, turn.english, conv.settings.display)}]
        return (conv, chat, _hidden(False), _hidden(True), _hidden(False))

    def send(message, chat, conv):
        message = (message or "").strip()
        if conv is None or not message:
            return "", chat, conv
        chat = chat + [{"role": "user", "content": message}]
        turn = conv.send(message)
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
            gr.Markdown("### Set up your practice\n**Scenario:** ordering at a Chinese café (more coming soon)")
            level = gr.Radio(list(LEVELS), value="A2", label="Your level")
            difficulty = gr.Radio(list(DIFFICULTIES), value="Standard", label="Conversation difficulty")
            display = gr.CheckboxGroup(DISPLAY_CHOICES, value=["chinese", "pinyin"],
                                       label="Show the waiter's words as")
            start_btn = gr.Button("Start conversation", variant="primary")

        with gr.Column(visible=False) as chat_view:
            chatbot = _make_chatbot(height=420, elem_id="chat", label="小林 · café waiter")
            msg = gr.Textbox(placeholder="Type your reply in Chinese, then press Enter",
                             show_label=False, autofocus=True)
            if transcriber is not None:
                mic = gr.Audio(sources=["microphone"], type="filepath",
                               label="Or say it in Chinese. What I heard appears above: check it, then press Enter.")
            end_btn = gr.Button("End conversation and get my report")

        with gr.Column(visible=False) as report_view:
            report_md = gr.Markdown(elem_id="report")
            again_btn = gr.Button("Start a new conversation", variant="primary")

        speech = f" · speech: {transcriber.name} (transcription, not a pronunciation score)" if transcriber else ""
        gr.Markdown(f"<small>Model: {backend.name} · prompts {PROMPT_VERSION}{speech} · "
                    "Prototype: answers can be wrong.</small>")

        start_btn.click(start, [level, difficulty, display],
                        [conv_state, chatbot, onboarding, chat_view, report_view])
        msg.submit(send, [msg, chatbot, conv_state], [msg, chatbot, conv_state])
        if transcriber is not None:
            mic.stop_recording(heard, [mic, msg], [msg, mic])
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
    from convo.speech import load_transcriber

    build_app(load_backend(), load_transcriber()).launch()
