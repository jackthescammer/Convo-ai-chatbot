import unittest
from unittest import mock

from convo import speech
from convo.speech import WhisperTranscriber, make_transcript


class FakePipe:
    def __init__(self, text):
        self.text = text
        self.calls = []

    def __call__(self, audio, generate_kwargs=None):
        self.calls.append((audio, generate_kwargs))
        return {"text": self.text}


class SpeechTest(unittest.TestCase):
    def test_forces_mandarin_and_strips_space(self):
        pipe = FakePipe("  我要一杯拿铁。 ")
        t = WhisperTranscriber("fake/whisper", pipe=pipe).transcribe("clip.wav")
        self.assertEqual(t.text, "我要一杯拿铁。")
        self.assertTrue(t.has_chinese)
        self.assertEqual(pipe.calls[0], ("clip.wav", {"language": "chinese", "task": "transcribe"}))

    def test_no_audio_means_no_call(self):
        pipe = FakePipe("x")
        t = WhisperTranscriber("fake/whisper", pipe=pipe).transcribe(None)
        self.assertEqual((t.text, t.has_chinese), ("", False))
        self.assertEqual(pipe.calls, [])

    def test_english_is_flagged(self):
        t = make_transcript("I would like a latte")
        self.assertFalse(t.has_chinese)

    def test_traditional_converted_when_opencc_available(self):
        class FakeCC:
            def __init__(self, cfg):
                self.cfg = cfg

            def convert(self, text):
                return text.replace("鐵", "铁")

        fake = mock.MagicMock(OpenCC=FakeCC)
        with mock.patch.dict("sys.modules", {"opencc": fake}):
            t = make_transcript("我要一杯拿鐵")
        self.assertEqual((t.text, t.raw, t.converted), ("我要一杯拿铁", "我要一杯拿鐵", True))

    def test_without_opencc_text_is_unchanged(self):
        with mock.patch.dict("sys.modules", {"opencc": None}):
            text, converted = speech.to_simplified("拿鐵")
        self.assertEqual((text, converted), ("拿鐵", False))


if __name__ == "__main__":
    unittest.main()
