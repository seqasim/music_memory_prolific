# Agent handoff — music_memory_prolific

## What this repo is

Standalone **jsPsych 7** copy of the Rutgers / Mount Sinai **Music Memory** task. It is meant to be the root of a **Pavlovia (GitLab)** project whose run link is distributed through **Prolific**.

Human-facing task description, folder layout, data schema, and Pavlovia/Prolific deployment guide: see [`README.md`](README.md).

Source of the copy (read-only; do not edit):  
`/Users/salmanqasim/Library/CloudStorage/OneDrive-TheMountSinaiHospital/Tasks/Rutgers/Music_Memory/MasterVersion/online_version`

---

## Hard constraints

1. **Never modify the OneDrive master.** All edits happen in this repo only.
2. **WAV → MP3 conversion is manual** (done by the user). Do not add or run conversion steps. `tools/generate_manifest.py` already accepts both `.mp3` and `.wav`. `tools/convert_audio.sh` is a legacy helper; leave it alone unless the user asks.
3. Keep **`index.html` at the repo root** (Pavlovia requirement). Never hand-edit **`js/stimuli_manifest.js`** — regenerate it with `python3 tools/generate_manifest.py --birth-year 1993`.
4. This repo bundles the **1993 birth cohort** music only (release years ~2008–2022). One Pavlovia project = one cohort.

---

## Current state

| Area | State |
|------|-------|
| Encoding / survey / recall / audio check / randomization | Complete; runs locally via `python3 -m http.server` |
| Tidy CSV + localStorage backup | Complete; `finalize()` stamps `completed_session = 1` on all rows |
| Experimenter short test (`test.html`) | Complete |
| Pavlovia data upload | Wired — vendored `lib/jspsych-7-pavlovia-2022.1.1.js`, loaded from `index.html` / `test.html`; `init`/`finish` run on `*.pavlovia.org` |
| Prolific ID capture + completion redirect | Complete — URL params, birth-year-only form when PID present, completion screen after `finish` with redirect + fallback link |
| Desktop guard | `CONFIG.requireDesktop = true`; blocks phones/tablets |
| Stimulus tooling | Standalone: `setup_stimuli.sh` copies from an explicit source folder; `generate_manifest.py` uses repo `stimuli/` only |
| Videos in `stimuli/` | Real `.mp4` files (108 encoding + 216 retrieval) |
| Music in `stimuli/music_*` | 36 MEAM + 36 control `.mp3` (1993 cohort); manifest regenerated |

Implementation notes:

- The 2022.1.1 Pavlovia plugin has no `completedCallback`. Redirect happens in a dedicated trial **after** `finish` (upload is awaited inside `finish`). `errorCallback` sets `window._pavloviaUploadError` for the completion screen.
- The 2021.12 plugin fallback is unavailable (404 on `lib.pavlovia.org`); do not rely on it.
- `sendBeacon('/save-checkpoint')` was removed; dropout protection is localStorage only.

---

## Remaining work (operator / deploy)

1. Put the real Prolific completion code into `CONFIG.prolific.completionUrl` in `js/config.js` (replace `REPLACE_ME`).
2. `git init` (if needed) and push this folder as the root of a Pavlovia jsPsych project; set Results format to CSV; Pilot then Running. See README.
3. On Prolific: paste the Pavlovia run URL with URL parameters, set completion redirect, restrict to desktop + audio, age-screen for the 1993 cohort.

---

## Verification commands

```bash
cd /Users/salmanqasim/Documents/GitRepos/music_memory_prolific
node tools/smoke_test.js
python3 tools/smoke_test.py
python3 -m http.server 8080
# then open http://localhost:8080/test.html?PROLIFIC_PID=test
# CSV should have completed_session=1 and prolific_pid=test; completion screen shows fallback link
```

---

## Key file map

| Path | Owns |
|------|------|
| `index.html` | Participant entry; loads jsPsych + Pavlovia plugin + project scripts; calls `runExperiment()` |
| `test.html` | Experimenter short session; sets `window.TEST_MODE = true` |
| `lib/jspsych-7-pavlovia-2022.1.1.js` | Vendored Pavlovia jsPsych 7 plugin |
| `js/config.js` | Timing, trial counts, keys, instructions, survey questions, Prolific/data options, test overrides |
| `js/stimuli_manifest.js` | Auto-generated file list (do not hand-edit) |
| `js/randomization.js` | Per-participant assignment (lists, conditions, music, lures) |
| `js/datasaver.js` | Tidy CSV schema, localStorage backup |
| `js/common.js` | Instructions, fixation, audio check, test verification screen |
| `js/encoding.js` | Encoding phase timeline |
| `js/survey.js` | Survey phase timeline |
| `js/recall.js` | Recall phase timeline |
| `js/experiment.js` | Entry form, URL params, desktop guard, timeline assembly, Pavlovia init/finish, completion screen |
| `tools/setup_stimuli.sh` | Copy stimuli from an explicit source folder and regenerate manifest |
| `tools/generate_manifest.py` | Writes `js/stimuli_manifest.js` |
| `tools/convert_audio.sh` | Legacy WAV→MP3 helper (manual conversion preferred) |
| `tools/smoke_test.js` | Node assignment / config / datasaver / key-mapping checks |
| `tools/smoke_test.py` | Manifest count checks |
