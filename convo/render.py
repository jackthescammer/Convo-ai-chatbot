"""Turning waiter turns into display text (Chinese / pinyin / English, any mix)."""

import re


def to_pinyin(text):
    """Pinyin with tone marks. Computed with pypinyin, never by the language model."""
    try:
        from pypinyin import Style, pinyin
    except ImportError as exc:  # pragma: no cover
        raise ImportError("pinyin needs the 'pypinyin' package: pip install pypinyin") from exc
    parts = [chunk[0] for chunk in pinyin(text, style=Style.TONE)]
    joined = " ".join(parts)
    return re.sub(r"\s+([，。？！、；：,.?!;:])", r"\1", joined)


def format_turn(reply, english, display, pinyin_fn=to_pinyin):
    """Markdown for one waiter message, honouring the learner's display preference."""
    lines = []
    if "chinese" in display:
        lines.append(reply)
    if "pinyin" in display:
        lines.append(f"*{pinyin_fn(reply)}*")
    if "english" in display and english:
        lines.append(f"> {english}")
    # Never show an empty bubble (e.g. English-only chosen but no translation available).
    return "\n\n".join(lines) if lines else reply
