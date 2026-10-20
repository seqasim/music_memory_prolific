#!/usr/bin/env python3
"""Export Memento10k metadata for videos used in this task.

Writes stimuli/memento_video_meta.json keyed by basename (and full stimuli path).

Usage:
  python3 tools/export_memento_meta.py
  python3 tools/export_memento_meta.py --db /path/to/video_database_full
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB = Path("/Users/salmanqasim/Documents/Projects/MusicMemory/video_database_full")
OUT_PATH = ROOT / "stimuli" / "memento_video_meta.json"


def load_memento_records(db: Path) -> dict[str, dict]:
    records: dict[str, dict] = {}
    for name in (
        "memento_train_data.json",
        "memento_val_data.json",
        "memento_test_data.json",
    ):
        path = db / name
        if not path.exists():
            raise FileNotFoundError(f"Missing {path}")
        for rec in json.loads(path.read_text(encoding="utf-8")):
            records[rec["filename"]] = rec
    return records


def video_basenames() -> list[tuple[str, str]]:
    """Return (basename, relative_path) for encoding + retrieval videos."""
    pairs: list[tuple[str, str]] = []
    for folder in ("encoding_videos", "retrieval_videos"):
        directory = ROOT / "stimuli" / folder
        for path in sorted(directory.glob("*.mp4")):
            pairs.append((path.name, f"stimuli/{folder}/{path.name}"))
    return pairs


def slim_record(rec: dict) -> dict:
    out = {
        "action_labels": rec.get("action_labels") or [],
        "captions": rec.get("captions") or [],
        "audio_description": rec.get("audio_description") or "",
    }
    if "mem_score" in rec:
        out["mem_score"] = rec["mem_score"]
    if "alpha" in rec:
        out["alpha"] = rec["alpha"]
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--out", type=Path, default=OUT_PATH)
    args = parser.parse_args()

    records = load_memento_records(args.db)
    pairs = video_basenames()
    missing = [base for base, _ in pairs if base not in records]
    if missing:
        raise SystemExit(f"Missing Memento records for {len(missing)} videos, e.g. {missing[:5]}")

    out: dict = {
        "_meta": {
            "source": "Memento10k (Newman et al., ECCV 2020; http://memento.csail.mit.edu/)",
            "database_path": str(args.db),
            "n_videos": len({base for base, _ in pairs}),
            "n_encoding": len(list((ROOT / "stimuli" / "encoding_videos").glob("*.mp4"))),
            "n_retrieval": len(list((ROOT / "stimuli" / "retrieval_videos").glob("*.mp4"))),
        }
    }

    seen: set[str] = set()
    for base, rel in pairs:
        if base in seen:
            # Same basename may appear in encoding and retrieval folders.
            slim = slim_record(records[base])
            out[rel] = slim
            continue
        seen.add(base)
        slim = slim_record(records[base])
        out[base] = slim
        out[rel] = slim

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(out, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"Wrote {args.out} ({len(seen)} unique basenames)")


if __name__ == "__main__":
    main()
