#!/usr/bin/env python3
"""Validate manifest counts and assignment structure without a browser."""

from __future__ import annotations

import json
import random
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "js" / "stimuli_manifest.js"
CONFIG = ROOT / "js" / "config.js"


def load_manifest() -> dict:
    text = MANIFEST.read_text(encoding="utf-8")
    match = re.search(r"const STIMULI_MANIFEST = (\{.*\});\s*", text, re.DOTALL)
    if not match:
        raise RuntimeError("Could not parse stimuli_manifest.js")
    return json.loads(match.group(1))


def load_default_birth_year() -> int:
    text = CONFIG.read_text(encoding="utf-8")
    match = re.search(r"defaultBirthYear:\s*(\d+)", text)
    if not match:
        raise RuntimeError("Could not parse CONFIG.defaultBirthYear")
    return int(match.group(1))


def basename_no_ext(path: str) -> str:
    name = path.split("/")[-1]
    return re.sub(r"\.[^.]+$", "", name)


def main() -> None:
    manifest = load_manifest()
    encoding = manifest["encodingVideos"]
    retrieval = manifest["retrievalVideos"]
    birth_year = load_default_birth_year()

    assert manifest["birthYearUsed"] == birth_year, (manifest["birthYearUsed"], birth_year)
    assert len(encoding) == 108, len(encoding)
    assert len(retrieval) == 216, len(retrieval)
    assert len(manifest["meamMusic"]) == 36, len(manifest["meamMusic"])
    assert len(manifest["controlMusic"]) == 36, len(manifest["controlMusic"])
    assert all(not path.endswith("audio_check.mp3") for path in manifest["meamMusic"])
    assert all(not path.endswith("audio_check.mp3") for path in manifest["controlMusic"])

    encoding_names = {basename_no_ext(p) for p in encoding[:108]}
    lures = [p for p in retrieval if basename_no_ext(p) not in encoding_names]
    assert len(lures) >= 108, len(lures)

    print("smoke_test OK")
    print("  birth year:", birth_year)
    print("  encoding videos:", len(encoding))
    print("  retrieval videos:", len(retrieval))
    print("  lure videos:", len(lures))
    print("  meam music:", len(manifest["meamMusic"]))
    print("  control music:", len(manifest["controlMusic"]))

    # Test mode design counts (mirrors CONFIG.TEST_OVERRIDES)
    test_num_lists = 1
    test_encoding_per_list = 3
    test_recall_per_list = 6
    test_conditions = {"no_music": 1, "meam": 1, "control_music": 1}
    assert sum(test_conditions.values()) == test_encoding_per_list
    assert test_recall_per_list == test_encoding_per_list * 2
    expected_survey = test_conditions["meam"] + test_conditions["control_music"]
    survey_questions = 4
    print("smoke_test OK (test mode design)")
    print("  encoding trials:", test_num_lists * test_encoding_per_list)
    print("  survey clips:", expected_survey)
    print("  survey rating rows:", expected_survey * survey_questions)
    print("  recall trials:", test_num_lists * test_recall_per_list)


if __name__ == "__main__":
    main()
