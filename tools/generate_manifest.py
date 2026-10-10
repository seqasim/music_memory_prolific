#!/usr/bin/env python3
"""
generate_manifest.py — Build stimuli_manifest.js from stimulus folders
======================================================================
Browsers cannot list directories, so this script scans your stimulus folders
and writes a JavaScript file the experiment loads at runtime.

Run from the repo root:
    python3 tools/generate_manifest.py --birth-year 1993

Optional arguments:
    --birth-year 1993          Birth year for music filtering (default: 1993)
    --encoding-dir PATH        Override encoding video folder
    --retrieval-dir PATH       Override retrieval (lure) video folder
    --meam-dir PATH            MEAM music folder
    --control-dir PATH         Control music folder

After running, commit the updated js/stimuli_manifest.js to your Pavlovia repo.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
ONLINE_ROOT = SCRIPT_DIR.parent
OUTPUT_FILE = ONLINE_ROOT / "js" / "stimuli_manifest.js"

DEFAULT_PATHS = {
    "encoding": ONLINE_ROOT / "stimuli" / "encoding_videos",
    "retrieval": ONLINE_ROOT / "stimuli" / "retrieval_videos",
    "meam": ONLINE_ROOT / "stimuli" / "music_meam",
    "control": ONLINE_ROOT / "stimuli" / "music_control",
}

MUSIC_PATTERN = re.compile(r"Cut_(\d+)_", re.IGNORECASE)


def list_files(folder: Path, extensions: tuple[str, ...]) -> list[str]:
    """Return sorted filenames with given extensions from folder."""
    if not folder.is_dir():
        return []
    names = []
    for path in sorted(folder.iterdir()):
        if path.name.startswith("."):
            continue
        if path.suffix.lower() in extensions and path.exists():
            names.append(path.name)
    return names


def filter_music(files: list[str], birth_year: int, offset_min: int, offset_max: int, year_cap: int) -> list[str]:
    """Keep music files whose Cut_<YEAR> falls in the allowed window."""
    year_min = birth_year + offset_min
    year_max = min(birth_year + offset_max, year_cap)
    kept = []
    for name in files:
        match = MUSIC_PATTERN.search(name)
        if not match:
            continue
        year = int(match.group(1))
        if year_min <= year <= year_max:
            kept.append(name)
    return kept


def to_web_path(folder_key: str, filename: str) -> str:
    """Build browser-relative path under stimuli/ (must be servable from repo root)."""
    folder_map = {
        "encoding": "stimuli/encoding_videos",
        "retrieval": "stimuli/retrieval_videos",
        "meam": "stimuli/music_meam",
        "control": "stimuli/music_control",
    }
    return f"{folder_map[folder_key]}/{filename}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate js/stimuli_manifest.js")
    parser.add_argument("--birth-year", type=int, default=1993)
    parser.add_argument("--music-offset-min", type=int, default=15)
    parser.add_argument("--music-offset-max", type=int, default=30)
    parser.add_argument("--music-year-cap", type=int, default=2023)
    parser.add_argument("--encoding-dir", type=Path, default=None)
    parser.add_argument("--retrieval-dir", type=Path, default=None)
    parser.add_argument("--meam-dir", type=Path, default=None)
    parser.add_argument("--control-dir", type=Path, default=None)
    args = parser.parse_args()

    encoding_dir = args.encoding_dir or DEFAULT_PATHS["encoding"]
    retrieval_dir = args.retrieval_dir or DEFAULT_PATHS["retrieval"]
    meam_dir = args.meam_dir or DEFAULT_PATHS["meam"]
    control_dir = args.control_dir or DEFAULT_PATHS["control"]

    encoding_files = list_files(encoding_dir, (".mp4",))
    retrieval_files = list_files(retrieval_dir, (".mp4",))

    meam_raw = list_files(meam_dir, (".mp3", ".wav"))
    control_raw = list_files(control_dir, (".mp3", ".wav"))

    meam_files = filter_music(
        meam_raw, args.birth_year, args.music_offset_min, args.music_offset_max, args.music_year_cap
    )
    control_files = filter_music(
        control_raw, args.birth_year, args.music_offset_min, args.music_offset_max, args.music_year_cap
    )

    manifest = {
        "generatedAt": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
        "birthYearUsed": args.birth_year,
        "encodingVideos": [to_web_path("encoding", f) for f in encoding_files],
        "retrievalVideos": [to_web_path("retrieval", f) for f in retrieval_files],
        "meamMusic": [to_web_path("meam", f) for f in meam_files],
        "controlMusic": [to_web_path("control", f) for f in control_files],
        "sourceFolders": {
            "encoding": str(encoding_dir),
            "retrieval": str(retrieval_dir),
            "meam": str(meam_dir),
            "control": str(control_dir),
        },
        "counts": {
            "encodingVideos": len(encoding_files),
            "retrievalVideos": len(retrieval_files),
            "meamMusic": len(meam_files),
            "controlMusic": len(control_files),
        },
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    js_content = (
        "/**\n"
        " * AUTO-GENERATED by tools/generate_manifest.py — do not edit by hand.\n"
        " * Re-run the script after adding/removing stimulus files.\n"
        " */\n"
        f"const STIMULI_MANIFEST = {json.dumps(manifest, indent=2)};\n\n"
        "if (typeof window !== 'undefined') {\n"
        "  window.STIMULI_MANIFEST = STIMULI_MANIFEST;\n"
        "}\n"
    )
    OUTPUT_FILE.write_text(js_content, encoding="utf-8")

    print(f"Wrote {OUTPUT_FILE}")
    print("Counts:", manifest["counts"])
    if manifest["counts"]["meamMusic"] < 36 or manifest["counts"]["controlMusic"] < 36:
        print(
            f"WARNING: Task needs 36 MEAM + 36 control clips. "
            f"Try --birth-year 1993 if using 1993-era music (years 2008-2023)."
        )
    if manifest["counts"]["meamMusic"] == 0 or manifest["counts"]["controlMusic"] == 0:
        print("WARNING: No music files found. Add music to stimuli/music_meam and stimuli/music_control.")


if __name__ == "__main__":
    main()
