#!/usr/bin/env bash
# =============================================================================
# create_cohort_repo.sh — Build a sibling Pavlovia repo for one birth year
# =============================================================================
# Videos, audio check, person-count labels, and Memento metadata are copied
# from this repo. Only the music set comes from the year folder.
#
#   bash tools/create_cohort_repo.sh 1967 /path/to/1967_stimuli
#   bash tools/create_cohort_repo.sh 1967 /path/to/1967_stimuli /custom/dest
#
# The source folder must contain meam_stimuli_UI/ and control_stimuli_UI/,
# or music_meam/ and music_control/. WAV files are copied as-is.
#
# Default destination:
#   ../music_memory_prolific_<YEAR>
# Remote (configured, not pushed):
#   https://gitlab.pavlovia.org/seqasim/music-memory-prolific-<YEAR>.git
# =============================================================================

set -euo pipefail

usage() {
  echo "Usage: bash tools/create_cohort_repo.sh <birth_year> </path/to/year_stimuli> [target_repo_dir]" >&2
}

if [[ $# -lt 2 || $# -gt 3 ]]; then
  usage
  exit 1
fi

YEAR="$1"
SRC="$2"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
PARENT_DIR="$(cd "$BASE_REPO/.." && pwd)"
DEST="${3:-$PARENT_DIR/music_memory_prolific_${YEAR}}"

if ! [[ "$YEAR" =~ ^[0-9]{4}$ ]]; then
  echo "Birth year must be a 4-digit year, got: $YEAR" >&2
  exit 1
fi

if [[ ! -d "$SRC" ]]; then
  echo "Source folder not found: $SRC" >&2
  exit 1
fi

SRC="$(cd "$SRC" && pwd)"

if [[ -d "$SRC/meam_stimuli_UI" && -d "$SRC/control_stimuli_UI" ]]; then
  :
elif [[ -d "$SRC/music_meam" && -d "$SRC/music_control" ]]; then
  :
else
  echo "ERROR: source must contain meam_stimuli_UI/ and control_stimuli_UI/, or music_meam/ and music_control/." >&2
  echo "Looked in: $SRC" >&2
  exit 1
fi

if [[ "$DEST" != /* ]]; then
  DEST="$(cd "$(dirname "$DEST")" && pwd)/$(basename "$DEST")"
fi

if [[ "$DEST" == "$BASE_REPO" || "$DEST" == "$BASE_REPO"/* ]]; then
  echo "Refusing to write the cohort repo inside the base repo: $DEST" >&2
  exit 1
fi

if [[ "$DEST" == "$SRC" || "$DEST" == "$SRC"/* ]]; then
  echo "Refusing to write the cohort repo inside the stimulus source: $DEST" >&2
  exit 1
fi

mkdir -p "$DEST"

echo "=== Copying task and shared videos ==="
echo "From: $BASE_REPO"
echo "To:   $DEST"
rsync -aL \
  --exclude '.git/' \
  --exclude '.DS_Store' \
  --exclude 'data/' \
  --exclude 'music-memory-prolific/' \
  --exclude 'stimuli/music_meam/' \
  --exclude 'stimuli/music_control/' \
  "$BASE_REPO/" "$DEST/"

echo "=== Stamping birth year $YEAR ==="
python3 - "$DEST" "$YEAR" <<'PY'
import re
import sys
from pathlib import Path

dest = Path(sys.argv[1])
year = sys.argv[2]

config = dest / "js" / "config.js"
text = config.read_text(encoding="utf-8")
updated, count = re.subn(r"(defaultBirthYear:\s*)\d+", rf"\g<1>{year}", text, count=1)
if count != 1:
    raise SystemExit(f"Could not stamp defaultBirthYear in {config}")
config.write_text(updated, encoding="utf-8")

marker = re.compile(r"(Bundled birth cohort:\s*)\d{4}")
for rel in ("README.md", "AGENTS.md"):
    path = dest / rel
    doc = path.read_text(encoding="utf-8")
    updated, count = marker.subn(rf"\g<1>{year}", doc, count=1)
    if count != 1:
        raise SystemExit(f"Could not stamp bundled cohort in {path}")
    path.write_text(updated, encoding="utf-8")

print(f"Stamped defaultBirthYear and docs to {year}")
PY

echo "=== Installing $YEAR music ==="
bash "$DEST/tools/setup_stimuli.sh" --music-only "$SRC" "$YEAR"

echo "=== Smoke tests ==="
(
  cd "$DEST"
  node tools/smoke_test.js
  python3 tools/smoke_test.py
)

echo "=== Git ==="
REMOTE="https://gitlab.pavlovia.org/seqasim/music-memory-prolific-${YEAR}.git"
(
  cd "$DEST"
  if [[ ! -d .git ]]; then
    git init -b main
  fi
  if git remote get-url origin >/dev/null 2>&1; then
    git remote set-url origin "$REMOTE"
  else
    git remote add origin "$REMOTE"
  fi
  git add -A
  if git diff --cached --quiet; then
    echo "No changes to commit."
  else
    git commit -m "$(cat <<EOF
Initialize Music Memory online task for ${YEAR} cohort.

EOF
)"
  fi
  git status -sb
  git remote -v
)

cat <<EOF

Cohort repo ready: $DEST
Pavlovia remote (not pushed): $REMOTE

Next steps:
1. If music files are still WAV, convert them to MP3 manually, replace the files in
   stimuli/music_meam and stimuli/music_control, then:
     cd "$DEST"
     python3 tools/generate_manifest.py --birth-year $YEAR
     git add stimuli js/stimuli_manifest.js
     git commit -m "Convert ${YEAR} cohort music to MP3"
2. On Pavlovia, create an empty jsPsych project at seqasim/music-memory-prolific-${YEAR}.
3. Push:
     cd "$DEST"
     git push -u origin main
4. Set Results format to CSV, replace REPLACE_ME in js/config.js, then Pilot.
5. On Prolific, use that run URL, require desktop and audio, and age-screen for birth year ${YEAR}.
EOF
