#!/usr/bin/env bash
# =============================================================================
# convert_audio.sh — Convert stimulus files for web delivery
# =============================================================================
# Run from online_version/:
#   bash tools/convert_audio.sh
#
# What it does:
#   1. Converts all .wav music files to 192 kbps .mp3 (much smaller for browsers)
#   2. Converts audio_check.wav to mp3
#   3. Optionally re-encodes videos for broader browser support
#
# Requires: ffmpeg (install via brew install ffmpeg on Mac)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MASTER_DIR="$(cd "$ROOT_DIR/.." && pwd)"

AUDIO_BITRATE="192k"

convert_wav_folder() {
  local src_dir="$1"
  local dest_dir="$2"
  mkdir -p "$dest_dir"
  if [[ ! -d "$src_dir" ]]; then
    echo "Skip missing folder: $src_dir"
    return
  fi
  shopt -s nullglob
  for wav in "$src_dir"/*.wav; do
    local base
    base="$(basename "$wav" .wav)"
    echo "Converting $wav -> $dest_dir/${base}.mp3"
    ffmpeg -y -i "$wav" -codec:a libmp3lame -b:a "$AUDIO_BITRATE" "$dest_dir/${base}.mp3"
  done
}

echo "=== Converting music folders ==="
convert_wav_folder "$MASTER_DIR/meam_stimuli_UI" "$ROOT_DIR/stimuli/music_meam"
convert_wav_folder "$MASTER_DIR/control_stimuli_UI" "$ROOT_DIR/stimuli/music_control"

echo "=== Converting audio check ==="
mkdir -p "$ROOT_DIR/stimuli"
if [[ -f "$MASTER_DIR/audio_check.wav" ]]; then
  ffmpeg -y -i "$MASTER_DIR/audio_check.wav" -codec:a libmp3lame -b:a "$AUDIO_BITRATE" \
    "$ROOT_DIR/stimuli/audio_check.mp3"
fi

echo "=== Linking videos into stimuli/ (absolute symlinks for reliable serving) ==="
MASTER_DIR="$(cd "$ROOT_DIR/.." && pwd)"
mkdir -p "$ROOT_DIR/stimuli/encoding_videos" "$ROOT_DIR/stimuli/retrieval_videos"
for f in "$MASTER_DIR/encoding_videos/"*.mp4; do
  [ -f "$f" ] || continue
  ln -sf "$f" "$ROOT_DIR/stimuli/encoding_videos/$(basename "$f")"
done
for f in "$MASTER_DIR/retrieval_videos/"*.mp4; do
  [ -f "$f" ] || continue
  ln -sf "$f" "$ROOT_DIR/stimuli/retrieval_videos/$(basename "$f")"
done

echo "=== Regenerating stimuli manifest ==="
python3 "$SCRIPT_DIR/generate_manifest.py"

echo "Done."
