#!/usr/bin/env bash
# =============================================================================
# setup_stimuli.sh — Copy stimuli into this repo and regenerate the manifest
# =============================================================================
# Run from the repo root:
#   bash tools/setup_stimuli.sh /path/to/source_stimuli 1993
#
# Arguments:
#   $1 = source folder containing encoding_videos/, retrieval_videos/,
#        music_meam/, and music_control/ (required)
#   $2 = birth year for music filtering (default: 1993)
# =============================================================================

set -euo pipefail

SRC_DIR="${1:-}"
BIRTH_YEAR="${2:-1993}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -z "$SRC_DIR" ]]; then
  echo "Usage: bash tools/setup_stimuli.sh /path/to/source_stimuli [birth_year]" >&2
  exit 1
fi

if [[ ! -d "$SRC_DIR" ]]; then
  echo "Source folder not found: $SRC_DIR" >&2
  exit 1
fi

SRC_DIR="$(cd "$SRC_DIR" && pwd)"

copy_folder() {
  local name="$1"
  local src="$SRC_DIR/$name"
  local dest="$ROOT_DIR/stimuli/$name"
  if [[ ! -d "$src" ]]; then
    echo "WARNING: missing source folder: $src" >&2
    return
  fi
  mkdir -p "$dest"
  echo "=== Copying $name ==="
  if command -v rsync >/dev/null 2>&1; then
    rsync -aL --exclude '.DS_Store' "$src/" "$dest/"
  else
    # Fallback when rsync is unavailable; -L follows symlinks into real files.
    rm -rf "$dest"
    mkdir -p "$dest"
    cp -RL "$src/." "$dest/"
  fi
}

copy_folder "encoding_videos"
copy_folder "retrieval_videos"
copy_folder "music_meam"
copy_folder "music_control"

if [[ -f "$SRC_DIR/audio_check.mp3" ]]; then
  mkdir -p "$ROOT_DIR/stimuli"
  cp -f "$SRC_DIR/audio_check.mp3" "$ROOT_DIR/stimuli/audio_check.mp3"
fi

echo "=== Regenerating manifest (birth year $BIRTH_YEAR) ==="
python3 "$SCRIPT_DIR/generate_manifest.py" --birth-year "$BIRTH_YEAR"

echo "=== Done ==="
python3 "$SCRIPT_DIR/smoke_test.py"
