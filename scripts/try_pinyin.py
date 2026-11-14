"""Print pinyin-typing candidates for some café sentences (needs: pip install Pinyin2Hanzi).

    python scripts/try_pinyin.py
    python scripts/try_pinyin.py "wo yao yi bei re na tie"
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from convo.pinyin_input import PinyinConverter  # noqa: E402

SAMPLES = [
    "ni hao",
    "wo yao yi bei kafei",
    "wo yao yi bei re na tie, xie xie",
    "you mei you lv cha?",
    "duo shao qian?",
    "wo xiang chi yi kuai dangao",
    "bu yao bing",
    "keyi shua ka ma?",
    "wǒ yào dài zǒu",
    "wo3 men2 yao4 jie2 zhang4",
    "wo yao kafie",
]

conv = PinyinConverter()
for text in sys.argv[1:] or SAMPLES:
    cands, problem = conv.candidates(text)
    print(f"{text!r:42} -> {' | '.join(cands) if cands else 'NOT PINYIN: ' + problem}")
