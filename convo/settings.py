"""Learner preferences chosen during onboarding."""

from dataclasses import dataclass

LEVELS = ("A1", "A2")
DIFFICULTIES = ("Easy", "Standard", "Challenging")
DISPLAY_OPTIONS = ("chinese", "pinyin", "english")


@dataclass(frozen=True)
class Settings:
    level: str = "A2"
    difficulty: str = "Standard"
    display: tuple = ("chinese", "pinyin")

    def __post_init__(self):
        if self.level not in LEVELS:
            raise ValueError(f"level must be one of {LEVELS}, got {self.level!r}")
        if self.difficulty not in DIFFICULTIES:
            raise ValueError(f"difficulty must be one of {DIFFICULTIES}, got {self.difficulty!r}")
        requested = set(self.display)
        unknown = requested - set(DISPLAY_OPTIONS)
        if unknown:
            raise ValueError(f"unknown display options: {sorted(unknown)}")
        if not requested:
            raise ValueError("choose at least one display option")
        # Normalise to a fixed order so Settings are comparable.
        object.__setattr__(self, "display", tuple(d for d in DISPLAY_OPTIONS if d in requested))
