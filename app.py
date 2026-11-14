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


def build_app(backend):
    def start(level, difficulty, display):
        if not display:
            gr.Warning("Pick at least one display option; showing Chinese characters.")
            display = ["chinese"]
        conv = Conversation(backend, Settings(level=level, difficulty=difficulty, display=tuple(display)))
        turn = conv.start()
        chat = [{"role": "assistant", "content": format_turn(turn.reply, turn.english, conv.settings.display)}]
        return (conv, chat, gr.update(visible=False), gr.update(visible=True), gr.update(visible=False))

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
            return gr.update(), gr.update(), gr.update()
        report = build_report(backend, conv.learner_sentences, conv.settings)
        return report.to_markdown(), gr.update(visible=False), gr.update(visible=True)

    def restart():
        return None, [], gr.update(visible=True), gr.update(visible=False), gr.update(visible=False)

    with gr.Blocks(title="Convo AI", css=CSS, theme=gr.themes.Base(neutral_hue="slate")) as app:
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
            chatbot = gr.Chatbot(type="messages", height=420, elem_id="chat", label="小林 · café waiter")
            msg = gr.Textbox(placeholder="Type your reply in Chinese, then press Enter",
                             show_label=False, autofocus=True)
            end_btn = gr.Button("End conversation and get my report")

        with gr.Column(visible=False) as report_view:
            report_md = gr.Markdown(elem_id="report")
            again_btn = gr.Button("Start a new conversation", variant="primary")

        gr.Markdown(f"<small>Model: {backend.name} · prompts {PROMPT_VERSION} · "
                    "Prototype: answers can be wrong.</small>")

        start_btn.click(start, [level, difficulty, display],
                        [conv_state, chatbot, onboarding, chat_view, report_view])
        msg.submit(send, [msg, chatbot, conv_state], [msg, chatbot, conv_state])
        end_btn.click(finish, [conv_state], [report_md, chat_view, report_view])
        again_btn.click(restart, None, [conv_state, chatbot, onboarding, chat_view, report_view])
    return app


if __name__ == "__main__":
    from convo.backends import load_backend

    build_app(load_backend()).launch()
