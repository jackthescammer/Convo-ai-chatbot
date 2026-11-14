"""Speech input (Phase 2): Mandarin speech -> text with Whisper.

The learner speaks, Whisper writes down what it heard, and the learner can check and
edit that text before sending it. Note: this is transcription, not pronunciation
assessment. Whisper guesses what you meant, so it can "hear" a correct sentence even
when the pronunciation was off.

Like the chat model, the transcriber sits behind one small interface
(`Transcriber.transcribe`), so a different speech model can be swapped in.
"""

import os
import re
from dataclasses import dataclass

DEFAULT_ASR_MODEL = "openai/whisper-small"
_HAN = re.compile(r"[一-鿿]")


@dataclass
class Transcript:
    text: str            # what to put in the learner's text box (simplified Chinese where possible)
    raw: str             # exactly what Whisper returned
    has_chinese: bool
    converted: bool      # True if traditional characters were converted to simplified


def to_simplified(text):
    """Whisper sometimes writes traditional characters; the MVP uses simplified.

    Returns (text, converted). Uses OpenCC if it is installed; otherwise returns the text unchanged.
    """
    try:
        from opencc import OpenCC
    except ImportError:
        return text, False
    simplified = OpenCC("t2s").convert(text)
    return simplified, simplified != text


def make_transcript(raw):
    raw = (raw or "").strip()
    text, converted = to_simplified(raw)
    return Transcript(text=text, raw=raw, has_chinese=bool(_HAN.search(text)), converted=converted)


class Transcriber:
    """Interface: audio file path -> Transcript."""

    name = "base"

    def transcribe(self, audio_path):
        raise NotImplementedError


class WhisperTranscriber(Transcriber):
    def __init__(self, model_id=DEFAULT_ASR_MODEL, device=None, pipe=None):
        self.name = model_id
        if pipe is not None:          # injected in tests
            self.pipe = pipe
            return
        import torch
        from transformers import pipeline

        use_gpu = device == "cuda" or (device is None and torch.cuda.is_available())
        self.pipe = pipeline(
            "automatic-speech-recognition",
            model=model_id,
            torch_dtype=torch.float16 if use_gpu else torch.float32,
            device=0 if use_gpu else -1,
        )

    def transcribe(self, audio_path):
        if not audio_path:
            return make_transcript("")
        # Force Mandarin so a strong accent isn't "heard" as another language.
        out = self.pipe(audio_path, generate_kwargs={"language": "chinese", "task": "transcribe"})
        return make_transcript(out.get("text", "") if isinstance(out, dict) else "")


def load_transcriber(model_id=None):
    """Load the speech model named by `model_id`, else $CONVO_ASR_MODEL, else whisper-small.

    The chosen model is always printed so it is never swapped silently.
    """
    model_id = model_id or os.environ.get("CONVO_ASR_MODEL") or DEFAULT_ASR_MODEL
    print(f"[convo] loading speech model: {model_id}")
    t = WhisperTranscriber(model_id)
    print(f"[convo] loaded {t.name}")
    return t
