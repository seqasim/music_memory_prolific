#!/usr/bin/env bash
# =============================================================================
# setup_stimuli.sh — Copy stimuli into this repo and regenerate the manifest
# =============================================================================
# Run from any cohort repo:
#   bash tools/setup_stimuli.sh /path/to/source_stimuli 1993
#   bash tools/setup_stimuli.sh --music-only /path/to/1967_stimuli 1967
#
# Source folder layouts (either is accepted):
#   encoding_videos/, retrieval_videos/, music_meam/, music_control/
#   meam_stimuli_UI/, control_stimuli_UI/   (OneDrive <YEAR>_stimuli folders)
#
# --music-only replaces stimuli/music_meam and stimuli/music_control and leaves
# the shared videos, audio check, and metadata files in place.
#
# When a clip exists as both .mp3 and .wav, only the .mp3 is copied.
# WAV files are copied as-is so they can be converted to MP3 manually later.
# =============================================================================

set -euo pipefail

MUSIC_ONLY=0
SRC_DIR=""
BIRTH_YEAR="1993"

usage() {
  echo "Usage: bash tools/setup_stimuli.sh [--music-only] /path/to/source_stimuli [birth_year]" >&2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --music-only)
      MUSIC_ONLY=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
    *)
      if [[ -z "$SRC_DIR" ]]; then
        SRC_DIR="$1"
      else
        BIRTH_YEAR="$1"
      fi
      shift
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -z "$SRC_DIR" ]]; then
  usage
  exit 1
fi

if [[ ! -d "$SRC_DIR" ]]; then
  echo "Source folder not found: $SRC_DIR" >&2
  exit 1
fi

if ! [[ "$BIRTH_YEAR" =~ ^[0-9]{4}$ ]]; then
  echo "Birth year must be a 4-digit year, got: $BIRTH_YEAR" >&2
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
    rm -rf "$dest"
    mkdir -p "$dest"
    cp -RL "$src/." "$dest/"
  fi
}

# Copy audio, preferring .mp3 when both .mp3 and .wav exist for the same stem.
copy_audio_prefer_mp3() {
  local src="$1"
  local dest="$2"
  local label="$3"
  local copied_mp3=0
  local copied_wav=0
  local skipped_wav=0
  local f base

  if [[ ! -d "$src" ]]; then
    echo "ERROR: missing music source folder: $src" >&2
    exit 1
  fi

  rm -rf "$dest"
  mkdir -p "$dest"
  shopt -s nullglob
  for f in "$src"/*.mp3; do
    base="$(basename "$f")"
    cp -f "$f" "$dest/$base"
    copied_mp3=$((copied_mp3 + 1))
  done
  for f in "$src"/*.wav; do
    base="$(basename "$f" .wav)"
    if [[ -f "$src/${base}.mp3" ]]; then
      skipped_wav=$((skipped_wav + 1))
      continue
    fi
    cp -f "$f" "$dest/${base}.wav"
    copied_wav=$((copied_wav + 1))
  done
  shopt -u nullglob

  echo "=== $label: ${copied_mp3} mp3, ${copied_wav} wav (skipped ${skipped_wav} wav with an mp3 twin) ==="
  if [[ "$copied_wav" -gt 0 ]]; then
    echo "NOTE: ${copied_wav} WAV file(s) copied into ${dest#"$ROOT_DIR"/}. Convert them to MP3 manually, replace the WAVs, then re-run: python3 tools/generate_manifest.py --birth-year ${BIRTH_YEAR}" >&2
  fi
  if [[ "$copied_mp3" -eq 0 && "$copied_wav" -eq 0 ]]; then
    echo "ERROR: no .mp3 or .wav files in $src" >&2
    exit 1
  fi
}

resolve_music_src() {
  local cohort_name="$1"
  local repo_name="$2"
  if [[ -d "$SRC_DIR/$cohort_name" ]]; then
    echo "$SRC_DIR/$cohort_name"
  elif [[ -d "$SRC_DIR/$repo_name" ]]; then
    echo "$SRC_DIR/$repo_name"
  fi
}

if [[ "$MUSIC_ONLY" -eq 0 ]]; then
  copy_folder "encoding_videos"
  copy_folder "retrieval_videos"
  if [[ -f "$SRC_DIR/audio_check.mp3" ]]; then
    mkdir -p "$ROOT_DIR/stimuli"
    cp -f "$SRC_DIR/audio_check.mp3" "$ROOT_DIR/stimuli/audio_check.mp3"
  fi
fi

MEAM_SRC="$(resolve_music_src meam_stimuli_UI music_meam)"
CONTROL_SRC="$(resolve_music_src control_stimuli_UI music_control)"

if [[ -z "$MEAM_SRC" || -z "$CONTROL_SRC" ]]; then
  echo "ERROR: source must contain meam_stimuli_UI/ and control_stimuli_UI/, or music_meam/ and music_control/." >&2
  echo "Looked in: $SRC_DIR" >&2
  exit 1
fi

copy_audio_prefer_mp3 "$MEAM_SRC" "$ROOT_DIR/stimuli/music_meam" "music_meam"
copy_audio_prefer_mp3 "$CONTROL_SRC" "$ROOT_DIR/stimuli/music_control" "music_control"

echo "=== Regenerating manifest (birth year $BIRTH_YEAR) ==="
python3 "$SCRIPT_DIR/generate_manifest.py" --birth-year "$BIRTH_YEAR"

echo "=== Done ==="
python3 "$SCRIPT_DIR/smoke_test.py"
