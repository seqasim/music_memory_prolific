# Music Memory Task — Online Version (jsPsych, Pavlovia, Prolific)

Browser-based version of the Rutgers / Mount Sinai **Music Memory** task, rewritten from the PsychoPy
experiments (`DIODE_music_memory_{ENCODING,SURVEY,RECALL}.psyexp`) for online data collection.
This folder is a standalone copy of `Music_Memory/MasterVersion/online_version` and is intended to be
the root of a **Pavlovia (GitLab) repository** whose run link is distributed through **Prolific**.

The whole session runs in one sitting (about 60 minutes). A consent screen comes first. Then:

1. **Encoding** — watch 108 short video clips; two thirds are accompanied by music; press F/J for person count during each video (the chosen label is boxed).
2. **Recall** — old/new recognition on 216 videos (108 seen, 108 lures), then confidence; source memory after OLD responses.
3. **Survey** — hear each of the 72 music clips again and answer 4 questions (click 1–5, 4 seconds each). The survey follows recognition so hearing the songs again cannot change the memory-test answers.

---

## Status

| Area | State |
|------|-------|
| Task logic (encoding, survey, recall, audio check, randomization) | Complete and tested locally |
| Tidy CSV output with localStorage dropout backup | Complete; `finalize()` stamps `completed_session = 1` |
| Experimenter short test mode (`test.html`) | Complete |
| Pavlovia data upload | Wired via vendored `vendor/jspsych-7-pavlovia-2022.1.1.js` (`init`/`finish` on Pavlovia hosts) |
| Prolific ID capture and completion redirect | Complete (set real `CONFIG.prolific.completionUrl` before going live) |
| Desktop / keyboard guard | `CONFIG.requireDesktop = true` |
| Stimulus files | 108 + 216 `.mp4` videos; 36 + 36 music clips; manifest generated for this checkout's cohort |

Bundled birth cohort: 1993

See [Before the first Prolific run](#before-the-first-prolific-run) for the remaining operator steps
(completion code + Pavlovia/Prolific deploy).

---

## Task description

### Design

- **9 lists (blocks) x 12 encoding trials = 108 encoding videos.**
  Each list contains 4 `no_music`, 4 `meam` (music-evoked autobiographical memory songs) and
  4 `control_music` trials, shuffled within the list.
- **Encoding trial:** fixation cross (3000 ms) followed by the video (about 3 s, 342x256 h264, shown at
  800x450). If the trial has music, the clip starts at fixation onset and stops when the video ends.
  During the video the participant presses **F = one person or fewer** or **J = more than one person**
  (does not end the trial). The first keypress draws a box around that choice. Person-count labels live in `stimuli/encoding_video_labels.json`
  (from Memento captions; confirm before production).
- **Recall:** 9 lists x 24 trials = 216 videos. Each list contains the 12 videos from the matching
  encoding list plus 12 never-seen lures, shuffled. Fixation 750 ms, then the video; the participant
  presses **Left arrow = OLD** or **Right arrow = NEW**, then confidence (**1 = Sure, 2 = Maybe, 3 = Guess**).
  After OLD only: source memory (**1 = No music, 2 = Music you knew, 3 = Music you did not know**).
  Each of those choices is boxed for a brief moment after it is made.
- **Survey (after recall):** every music clip heard during encoding (36 MEAM + 36 control = 72) is replayed
  for about 6 s, then rated with 4 items by clicking **1–5**: familiarity; autobiographical memory
  (none → vivid, specific memory); self-relevance; liking. Each question advances after 4 seconds
  if there is no click (`timed_out = 1`, response blank). A click is boxed briefly before the next question.
- **Consent:** the first screen is a short Rutgers research-information page. Agree continues; Decline
  stops on a dead-end screen with no completion link and no saved data. An agreed session logs one
  `question = consent` row.
- **Audio check:** before encoding and again before the survey the participant hears the word "dog",
  confirms they heard it (Y/N, replay on N) and types it. The block loops until typed correctly.
- **Breaks:** self-paced instruction screens between phases and at the start of each list; ENTER advances.

### Birth-year cohort and music selection

Music files are named `Cut_<releaseYear>_<n>.<ext>`. The PsychoPy task selects songs released between
`birthYear + 15` and `birthYear + 30` (capped at 2023), i.e. songs from the participant's adolescence
and young adulthood.

In the online version this filtering happens **once, when the stimulus manifest is generated**
(`tools/generate_manifest.py --birth-year YYYY`), not per participant at runtime. Each repository
bundles one cohort (36 MEAM + 36 control clips). Videos are the same for every year; only the music
changes. The cohort in this checkout is the bundled birth cohort named above. Consequently:

- One deployed Pavlovia project serves one birth cohort.
- On Prolific, restrict recruitment with the **age** prescreener so participants were born close to
  that cohort year.
- The birth year typed by the participant is recorded in the data but does **not** change which songs
  are played. A console warning is printed if it differs from `STIMULI_MANIFEST.birthYearUsed`.
- Another year is a sibling repository from `tools/create_cohort_repo.sh` (see below).

---

## Folder structure

```
music_memory_prolific/
  index.html              Main entry point (participants)
  test.html               Experimenter short test session (~5 min), sets window.TEST_MODE
  README.md               This file
  .gitignore              .DS_Store, data/
  vendor/                 Vendored Pavlovia plugin for jsPsych 7 (not named lib/: Pavlovia reserves that path)
  js/
    config.js             All tunable settings: timing, trial counts, keys, text, data options
    stimuli_manifest.js   AUTO-GENERATED list of stimulus paths (do not hand-edit)
    randomization.js      Builds the per-participant assignment (lists, conditions, music, lures)
    datasaver.js          Tidy CSV schema, localStorage backup, checkpoint hooks
    common.js             Shared screens: instructions, fixation, audio check, test summary
    consent.js            Research-information screen (agree / decline)
    encoding.js           Encoding phase timeline
    survey.js             Survey phase timeline
    recall.js             Recall phase timeline
    experiment.js         Entry form, URL params, assembles the full timeline, Pavlovia hooks
  stimuli/
    audio_check.mp3       "dog" (84 KB)
    encoding_videos/      108 x .mp4  (~18 MB)
    retrieval_videos/     216 x .mp4  (~36 MB; 108 of them are also encoding videos, 108 are lures)
    music_meam/           36 x Cut_YYYY_n (.wav or .mp3; see "Music files")
    music_control/        36 x Cut_YYYY_n (.wav or .mp3; see "Music files")
    encoding_video_labels.json  Person-count labels (one_or_fewer / multiple / ambiguous)
    encoding_video_labels.auto.json  Auto draft from Memento (tools/build_encoding_labels.py)
    memento_video_meta.json     Memento10k mem_score, alpha, captions, action_labels
  docs/
    PSYCHOPY_PORTING.md   How to mirror these changes in the PsychoPy task
    REVIEWER_CRITIQUE_RESPONSE.md  Critique → task-change mapping
  tools/
    export_memento_meta.py      Build memento_video_meta.json from the local Memento DB
    build_encoding_labels.py    Draft person-count labels from Memento captions
    setup_stimuli.sh      Copy stimuli from an explicit source folder; regenerate manifest
    create_cohort_repo.sh Build a sibling repo for another birth year (shared videos, new music)
    convert_audio.sh      Legacy ffmpeg WAV -> MP3 helper; not used (conversion is manual)
    generate_manifest.py  Writes js/stimuli_manifest.js (accepts .mp3 and .wav)
    smoke_test.js         node tools/smoke_test.js  (assignment, config, datasaver, keys)
    smoke_test.py         python3 tools/smoke_test.py (manifest counts)
```

jsPsych 7.3.4 and its plugins are loaded from `unpkg.com` in `index.html` / `test.html`
(`html-keyboard-response`, `video-keyboard-response`, `audio-keyboard-response`,
`html-button-response`, `survey-html-form`, `preload`, `call-function`).

---

## Creating this repo from the OneDrive master

Run once (the master folder is left untouched). `rsync -L` resolves the video symlinks so the repo
contains real `.mp4` files:

```bash
SRC="/Users/salmanqasim/Library/CloudStorage/OneDrive-TheMountSinaiHospital/Tasks/Rutgers/Music_Memory/MasterVersion/online_version"
DST="/Users/salmanqasim/Documents/GitRepos/music_memory_prolific"
mkdir -p "$DST"
rsync -aL --exclude '.DS_Store' \
  "$SRC/index.html" "$SRC/test.html" "$SRC/js" "$SRC/tools" "$SRC/stimuli" "$DST/"
printf '.DS_Store\ndata/\n' > "$DST/.gitignore"
```

### Music files

Convert music clips to MP3 **manually** (WAV originals are large) and place the `.mp3` files in
`stimuli/music_meam` and `stimuli/music_control`, keeping the `Cut_<YEAR>_<n>` names and removing any
`.wav` originals. The task code is extension-agnostic; the manifest generator picks up whatever
`.mp3`/`.wav` files are present. This template checkout has the 1993 cohort as MP3. A cohort repo
built by `create_cohort_repo.sh` keeps whatever audio you supply, and prints a reminder when that
audio is still WAV.

Then regenerate the manifest and run the smoke tests:

```bash
python3 tools/generate_manifest.py --birth-year 1993
node tools/smoke_test.js && python3 tools/smoke_test.py
```

To refresh stimuli from another source folder later:

```bash
bash tools/setup_stimuli.sh /path/to/source_stimuli 1993
bash tools/setup_stimuli.sh --music-only /path/to/1967_stimuli 1967
```

`--music-only` replaces `stimuli/music_meam` and `stimuli/music_control` and leaves the shared videos
in place. Source folders may be named `music_meam` / `music_control` or `meam_stimuli_UI` /
`control_stimuli_UI`. If a clip exists as both `.mp3` and `.wav`, only the `.mp3` is copied.

---

## Creating another birth-year cohort

Each birth year is its own repository and its own Pavlovia project. The new repo copies this task,
the videos, the audio check, the person-count labels, and the Memento metadata. It then installs
that year's music and sets the birth year.

```bash
bash tools/create_cohort_repo.sh 1967 \
  "/path/to/Music_Memory/1967_stimuli"
```

Optional third argument: destination directory. The default is a sibling of this repo,
`~/Documents/GitRepos/music_memory_prolific_<YEAR>`.

The script:

1. Copies this task and the shared video files.
2. Copies music from `<YEAR>_stimuli/meam_stimuli_UI` and `control_stimuli_UI` (or from
   `music_meam` / `music_control` if those are the folder names).
3. Sets `CONFIG.defaultBirthYear` and regenerates `js/stimuli_manifest.js`.
4. Runs `node tools/smoke_test.js` and `python3 tools/smoke_test.py`.
5. Initializes git on `main` and sets `origin` to
   `https://gitlab.pavlovia.org/seqasim/music-memory-prolific-<YEAR>.git`.

It does not push. Create the empty jsPsych project on Pavlovia first, then:

```bash
cd ~/Documents/GitRepos/music_memory_prolific_1967
git push -u origin main
```

If the source music is still WAV, convert those clips to MP3 manually, replace the files under
`stimuli/music_meam` and `stimuli/music_control`, regenerate the manifest with the same
`--birth-year`, and commit that audio swap before a live run. Then set Results format to CSV,
replace `REPLACE_ME` in `CONFIG.prolific.completionUrl`, and Pilot. On Prolific, age-screen for
that birth year.

---

## Running locally

Browsers block media from `file://`, so serve the folder:

```bash
cd music_memory_prolific
python3 -m http.server 8080
```

Open `http://localhost:8080/index.html`. At the end of a local session the CSV downloads automatically.

URL parameters (all optional):

| Parameter | Effect |
|-----------|--------|
| `?participant=P01&birthYear=1990` | Skips the entry form |
| `?phase=encoding` / `survey` / `recall` | Runs only that phase (debugging) |
| `?test=rutgers2026` | Short experimenter session (same as `test.html`); passphrase is `CONFIG.testPassphrase` |
| `?PROLIFIC_PID=...&STUDY_ID=...&SESSION_ID=...` | Added automatically by Prolific (see below) |

### Experimenter test mode

`http://localhost:8080/test.html` runs 1 list with 3 encoding trials (one per condition), 2 survey clips,
6 recall trials, then shows a verification table (rows logged vs expected, localStorage backup present)
and downloads a CSV. Test data uses experiment name `music_memory_online_TEST`.

---

## Deploying to Pavlovia

1. Sign in at [pavlovia.org](https://pavlovia.org) (GitLab account at `gitlab.pavlovia.org`).
2. Create a new project of type **jsPsych** (Dashboard > Experiments > New, or create an empty GitLab
   project and set the experiment type to jsPsych).
3. Push this folder as the repository root (`index.html` must be at the top level):

   ```bash
   cd music_memory_prolific
   git init && git add . && git commit -m "Music memory online task"
   git remote add origin https://gitlab.pavlovia.org/<user>/music_memory_prolific.git
   git push -u origin main
   ```

   Total repo size after mp3 conversion is roughly 70 MB, which is fine for GitLab.
4. In the experiment dashboard set **Results format: CSV**, then set status to **Piloting** to test
   using the pilot link (pilot runs are free, time-limited, and download the CSV to your machine).
5. To run for real, set status to **Running** and assign **credits** (one per completed session) or
   cover the project with an institutional licence.
6. The participant URL has the form `https://run.pavlovia.org/<user>/music_memory_prolific/index.html`
   (copy the exact link from the dashboard).

### How data reaches Pavlovia

The jsPsych Pavlovia plugin uploads **once**, when the `finish` trial runs at the very end of the
timeline, using `jsPsych.data.get().csv()`. There is no incremental upload for jsPsych projects
("save incomplete results" in the dashboard applies to PsychoJS only). Mitigations in this task:

- Every trial is also written to `localStorage` (`music_memory_data_<participant>_<timestamp>`) so a
  session that crashes on the participant's machine can be recovered by asking them to open the
  developer console, or by re-running with the same browser.
- `completed_session` distinguishes finished sessions from partial ones.

Results appear in the project's `data/` folder on GitLab and in the dashboard download as
`<user>_music_memory_prolific_<session>.csv`.

---

## Running on Prolific

1. **Study URL:** paste the Pavlovia run URL and choose *I'll use URL parameters*. Prolific appends
   `?PROLIFIC_PID={{%PROLIFIC_PID%}}&STUDY_ID={{%STUDY_ID%}}&SESSION_ID={{%SESSION_ID%}}`.
   The task reads these, uses `PROLIFIC_PID` as the participant ID (the entry form then only asks for
   birth year), and writes all three to every data row.
2. **Completion:** choose *I'll redirect them using a URL* and copy the completion URL
   (`https://app.prolific.com/submissions/complete?cc=XXXXXXXX`) into
   `CONFIG.prolific.completionUrl` in `js/config.js`. The redirect fires from a completion trial that
   runs immediately after Pavlovia `finish` (so after the upload attempt), and a clickable fallback
   link is always shown in case the redirect is blocked.
3. **Device and prescreening:** restrict to **desktop** (arrow keys are required), require **audio**
   in the study description, and set the **age** range to match the music cohort (see above). Set the
   estimated time to about 60 minutes and price accordingly.
4. **Pilot checklist** before publishing:
   - Preview the study from Prolific; confirm the URL contains `PROLIFIC_PID`.
   - Complete a `?test=rutgers2026` run via the Pavlovia pilot link; confirm the CSV arrives on Pavlovia
     with `prolific_pid`, `study_id`, `session_id` populated and `completed_session = 1`.
   - Confirm you land on the Prolific completion page.
   - Check the audio check cannot be bypassed, consent appears first, and an unanswered survey question advances after 3 seconds.

---

## Data format

Output is a tidy CSV, one row per event. Columns (`DATA_COLUMNS` in `js/datasaver.js`):

| Column | Meaning |
|--------|---------|
| `row_type` | `assignment_meta`, `assignment_encoding`, `assignment_survey`, `assignment_recall` (design rows written at start) or `trial` |
| `participant`, `birth_year`, `session_start_iso` | Session identifiers |
| `prolific_pid`, `study_id`, `session_id` | From Prolific URL parameters |
| `completed_session` | `1` if the participant reached the end, else `0` |
| `phase` | `consent`, `audio_check`, `encoding`, `recall`, `survey` |
| `list_num`, `trial_num`, `condition` | Position and music condition (`no_music`, `meam`, `control_music`) |
| `video_file`, `music_file` | Stimulus paths |
| `question` | Survey: question id or `music_replay`; encoding: `person_count`; recall: `confidence` / `source`; audio check: `typed_word`; consent: `consent` |
| `is_old`, `correct` | Recall recognition: 1 = old video; 1 = correct old/new. Also used for source scoring, encoding orienting, and the audio check |
| `response`, `rt_ms` | Response label/value and reaction time (ms from stimulus onset) |
| `timed_out` | `1` if a survey question advanced with no keypress; otherwise blank |
| `mem_score`, `mem_alpha` | Memento10k normative memorability and decay (encoding / recall rows) |
| `trial_onset_ms` | ms since session start |
| `browser`, `screen_width`, `screen_height`, `focus_lost_count` | Environment and attention proxies |
| `checkpoint_reason` | Reserved for checkpoint rows |

Notes for analysis:

- The Pavlovia CSV also contains the raw rows jsPsych itself records for every plugin trial
  (fixations, instruction screens, etc.). Keep only rows where `row_type` is non-empty.
- Recall accuracy: rows with `phase = recall` and empty `question`; hits are `is_old = 1 & response = old`, false alarms are
  `is_old = 0 & response = old`. Condition of an old video is in `condition` (also on `assignment_recall`).
- Confidence: `phase = recall`, `question = confidence`; `response` is `sure` / `maybe` / `guess`.
- Source: `phase = recall`, `question = source`; `response` is `no_music` / `knew` / `did_not_know`; `correct` scored vs encoding condition.
- Encoding orienting: `phase = encoding`, `question = person_count`; `response` is `one_or_fewer` / `multiple`; `correct` blank when the label is `ambiguous`.
- Survey ratings: `phase = survey`, `question != music_replay`; responses are `1`–`5` from a click. A timeout leaves `response` blank, `rt_ms` blank, and `timed_out = 1`.
- Consent: `phase = consent`, `question = consent`, `response = agreed` (decline saves nothing).

---

## Editing the task

| What to change | Where |
|----------------|-------|
| Fixation durations, list/trial counts, conditions per list | `js/config.js` top section |
| Instruction and break text | `js/config.js` > `instructions`, `breaks` |
| Survey questions, click scale, 4 s timeout | `js/config.js` > `surveyQuestions`, `surveyScaleValues`, `surveyQuestionTimeoutMs` |
| Confidence / source / person-count keys | `js/config.js` > `confidenceKeys`, `sourceKeys`, `encodingOrienting` |
| Person-count labels | `stimuli/encoding_video_labels.json` (confirm before production) |
| Memento memorability sidecar | `stimuli/memento_video_meta.json` via `tools/export_memento_meta.py` |
| Response keys (OLD/NEW, continue) | `js/config.js` > `recallKeys`, `continueKeys` |
| Prolific completion URL, desktop requirement | `js/config.js` > `prolific`, `requireDesktop` |
| Test-mode passphrase and trial counts | `js/config.js` > `testPassphrase`, `TEST_OVERRIDES` |
| How videos/music are shuffled and paired | `js/randomization.js` |
| Output columns | `js/datasaver.js` > `DATA_COLUMNS`, `_baseFields`, `logTrial` |
| Stimulus files | Edit folders under `stimuli/`, then `python3 tools/generate_manifest.py --birth-year YYYY` |
| Another birth year | `bash tools/create_cohort_repo.sh <YEAR> /path/to/<YEAR>_stimuli` |

Never hand-edit `js/stimuli_manifest.js`.

---

## Before the first Prolific run

Code wiring for Pavlovia and Prolific is in place. Operator steps still required:

1. Replace `REPLACE_ME` in `CONFIG.prolific.completionUrl` (`js/config.js`) with the completion code from
   the Prolific study editor.
2. Push this folder as the root of a Pavlovia **jsPsych** project (see [Deploying to Pavlovia](#deploying-to-pavlovia)).
3. Create the Prolific study with URL parameters + completion redirect (see [Running on Prolific](#running-on-prolific)).

Notes on the implementation:

- Prolific redirect runs in a trial **after** Pavlovia `finish` (the 2022.1.1 plugin has no
  `completedCallback`; it awaits the upload then ends the trial). A clickable fallback link is always shown.
- Auto-redirect is skipped while `completionUrl` still contains `REPLACE_ME`.
- The older `jspsych-7-pavlovia-2021.12.js` fallback is not available from Pavlovia (404).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Cannot run from file://" | Serve with `python3 -m http.server 8080` |
| "Missing stimulus file" alert at start | Stimulus folder empty or manifest stale: re-run `generate_manifest.py` |
| "Not enough MEAM/control music files" | Fewer than 36 clips survive the birth-year filter; check `--birth-year` and the cohort folder |
| Music does not play on the first trial | Browser autoplay policy; the entry form / ENTER press exists to unlock audio. Do not remove it |
| No data on Pavlovia | Plugin not loaded, `finish` trial never reached, or project not in Piloting/Running with credits |
| Pavlovia: unable to link PsychoJS library / `lib` File exists | Do not name any project folder `lib/`. This repo keeps the plugin under `vendor/`. Push that change, then retry Piloting |
| Software platform UNKNOWN on Pavlovia | Common for manually pushed jsPsych repos; the dashboard may not let you set it. Piloting can still work once the `lib/` clash is fixed. If status still fails, recreate the experiment via Pavlovia **New** as type jsPsych and push into that empty repo |
| Participant not returned to Prolific | `CONFIG.prolific.completionUrl` still `REPLACE_ME`, or redirect blocked; the fallback link covers the latter |
| Wrong songs for the cohort | Manifest generated with the wrong `--birth-year`; regenerate |
| Experiment slow to start | Expected: stimuli load per trial; only `audio_check.mp3` is preloaded |

---

## Credits

Based on the Rutgers / Mount Sinai Music Memory PsychoPy task (`DIODE_music_memory_*.psyexp`).
Online version: jsPsych 7.3.4.

Video clips are from **Memento10k** ([Newman et al., ECCV 2020](http://memento.csail.mit.edu/));
normative memorability (`mem_score`, `alpha`) and captions are exported via
`tools/export_memento_meta.py` for analysis covariates.
