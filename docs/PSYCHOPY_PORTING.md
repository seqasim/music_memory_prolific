# PsychoPy porting guide — SRE-aligned task changes

Use this document to mirror the online (jsPsych) revisions in
`DIODE_music_memory_{ENCODING,SURVEY,RECALL}.psyexp`. Wording and keys below
are copied from the online task so both versions stay aligned.

Online files touched for these changes:

- `js/config.js` — keys, prompts, survey items, instructions, session length
- `js/encoding.js` — person-count orienting during video
- `js/survey.js` — four 1–5 keypress items, 3 s timeout, after recognition
- `js/recall.js` — confidence + conditional source
- `js/randomization.js` — `encodingCondition` on old recall trials; Memento mem scores
- `js/datasaver.js` / `js/common.js` — logging and test verification
- `stimuli/encoding_video_labels.json` — person-count labels
- `stimuli/memento_video_meta.json` — Memento10k mem_score / captions (analysis)
- `index.html` / `test.html` — `html-button-response` plugin

Videos are from [Memento10k](http://memento.csail.mit.edu/) (Newman et al., ECCV 2020).

---

## 1. Encoding: person-count orienting

### Rationale

Indexes the cost of autobiographical retrieval competing with encoding (MEAM
trials slower / less accurate). Also serves as an attention check. Person count
is grounded in Memento captions and is better balanced than indoor/outdoor for
this clip set.

### Trial flow

**Before:** `fixation (3 s) → video (to end)` — no response.

**After:** `fixation (3 s) → video (to end) + person-count keyboard`

Music still starts at fixation onset and stops when the video ends.

### PsychoPy mapping

| Online step | PsychoPy |
|-------------|----------|
| Fixation | Text / Image component, duration 3.0 s |
| Video | Movie component, duration = video length |
| Orienting | Keyboard component **on the video routine** |

Keyboard settings:

- `allowedKeys`: `f`, `j` (case-insensitive if your Builder version allows)
- **Force end of Routine: unchecked** (response must *not* end the routine)
- Store first key and RT from video onset
- On-screen prompt (Text component under the movie):

```text
F = One person or fewer    J = More than one person
```

### Exact instruction wording (online)

**Orienting intro screen** (`CONFIG.instructions.encodingOrientingIntro`):

> Video judgments
>
> While each video plays, decide how many **people** are in the clip.
>
> **F** = One person or fewer  **J** = More than one person
>
> Count people only (not animals). If there are no people, press **F**.
>
> Press once as soon as you can. The video will keep playing until it ends.
>
> Also try to remember each video for a later memory test.

Block-start reminder: `F = One person or fewer    J = More than one person`

### Stimulus input

File: `stimuli/encoding_video_labels.json`

- Keys: basename (`foo.mp4`) and/or full path (`stimuli/encoding_videos/foo.mp4`)
- Values: `one_or_fewer` | `multiple` | `ambiguous`
- Ignore `_meta`
- Regenerate draft with `python3 tools/build_encoding_labels.py` (writes `.auto.json`);
  confirmed file is hand-reviewed. Ambiguous clips leave `correct` blank.

Also: `stimuli/memento_video_meta.json` (from `python3 tools/export_memento_meta.py`)
with `mem_score`, `alpha`, captions, `action_labels` per clip — analysis covariates
only (columns `mem_score`, `mem_alpha` in the CSV).

For PsychoPy, convert labels to a conditions column (e.g. `person_count_label`)
joined by video filename, or load the JSON in a Code component at experiment start.

### Data output (online tidy CSV)

| Field | Value |
|-------|--------|
| `phase` | `encoding` |
| `question` | `person_count` |
| `response` | `one_or_fewer` / `multiple` / empty if no key |
| `correct` | `1` / `0` / empty if label missing or `ambiguous` |
| `rt_ms` | ms from video onset |
| `mem_score`, `mem_alpha` | Memento10k memorability / decay (encoding + recall rows) |

Scoring: `response == scene_label` when label is `one_or_fewer` or `multiple`.

### Online-only notes

Labels and Memento meta are fetched via `fetch()` at session/encoding start.
PsychoPy should load them once at session start.

---

## 2. Survey: four keypress items, after recognition

### Rationale

Keeps the constructs that matter for self-referential thinking, preference, and
autobiographical memory, and drops the rest so the survey stays under about 24
minutes. The survey runs **after** recognition. Hearing each song again before
the memory test would re-expose the music and could change source-memory answers.

### Trial flow

Session order: encoding → recall → survey.

Per clip: `preload → play music (6 s) → Q1 → Q2 → Q3 → Q4`

Each question accepts keys **1–5** and ends after **3 seconds** if there is no
keypress.

### Question table

| id | type | text | labels |
|----|------|------|--------|
| familiarity | key_scale | How familiar is this song? | 1 Not at all … 5 Extremely |
| autobio_memory | key_scale | Did this song bring back memories from your own life? | 1 None … 5 Vivid, specific memory |
| self_relevance | key_scale | How much did this song make you think about yourself? | 1 Not at all … 5 Very much |
| liking | key_scale | How much do you like this song? | 1 Not at all … 5 Very much |

`familiarity` is the knew / did-not-know manipulation check (it also covers the
dropped `novelty` item). `autobio_memory` merges the old Yes/No specific-memory
item with reliving. `liking` covers preference (and stands in for the dropped
`valence` item).

**Dropped:** `specific_memory`, `reliving`, `age_first_heard`, `recent_exposure`,
`earworm`, `valence`, `arousal`, `distraction`, `novelty`.

**No free-text.**

### PsychoPy mapping

- Keyboard, `allowedKeys` = `1`–`5`, force end of Routine = true.
- Routine duration 3 s so a missed key still advances.
- Store the key, or blank plus a timeout flag when the routine ends with no key.

Music duration: first 6 s only (online uses `trial_duration: 6000`, not full file).

### Data output

| Field | Value |
|-------|--------|
| `phase` | `survey` |
| `question` | item `id` (or `music_replay` for the play row) |
| `response` | `1`–`5`, or blank on timeout |
| `timed_out` | `1` if no keypress; otherwise blank |
| `rt_ms` | keypress time, or blank on timeout |

---

## 3. Recall: confidence ratings

### Rationale

Supports ROC / dual-process (DPSD) analysis: separate recollection vs
familiarity and account for guessing. Canonical SRE selectively boosts
recollection.

### Trial flow

**Before:** `fixation → video+OLD/NEW → 500 ms highlight`

**After:** `fixation → video+OLD/NEW → confidence (1/2/3) → [source if OLD]`

### Keys and wording

- OLD / NEW unchanged: **Left = OLD**, **Right = NEW** (RT from video onset).
- Confidence keys: **1 = Sure**, **2 = Maybe**, **3 = Guess**
- Prompt:

```text
How sure are you?

1 = Sure    2 = Maybe    3 = Guess
```

Show the chosen OLD/NEW highlight above the confidence prompt (online does this).

### PsychoPy mapping

New routine after recognition Keyboard (force end of Routine = true):

- Text: confidence prompt
- Keyboard: `allowedKeys` = `1`, `2`, `3`; force end of Routine = true
- Store key and RT

### Data output (online)

Logged as a **separate row** (same as survey items):

| Field | Value |
|-------|--------|
| `phase` | `recall` |
| `question` | `confidence` |
| `response` | `sure` / `maybe` / `guess` |
| `rt_ms` | confidence RT |
| `is_old` | same as recognition trial |

Recognition row has empty `question` and `response` = `old` / `new`.

**6-point scale for analysis** (combine recognition + confidence):

| | Sure | Maybe | Guess |
|--|------|-------|-------|
| OLD | 6 | 5 | 4 |
| NEW | 1 | 2 | 3 |

(or the reverse; keep consistent with your ROC pipeline)

---

## 4. Recall: music-context source (OLD only)

### Rationale

Separates item memory from binding the video to its music context; addresses
“simply more richly associated” alternative.

### Conditional logic

Run source routine **only if** recognition response was OLD.

PsychoPy options:

1. Loop around source routine with `nReps = 1 if old_key else 0`
2. Or Code component Begin Routine: `continueRoutine = (recognition_key == 'left')`

### Keys and wording

```text
When you saw this video, was there:

1 = No music
2 = Music you knew
3 = Music you did not know
```

### Scoring

| Encoding condition | Correct source label |
|--------------------|----------------------|
| `no_music` | `no_music` (key 1) |
| `meam` | `knew` (key 2) |
| `control_music` | `did_not_know` (key 3) |

Online: old recall trials carry `encodingCondition` from assignment (matched by
video path). Lures / NEW responses skip source.

### Data output (online)

| Field | Value |
|-------|--------|
| `phase` | `recall` |
| `question` | `source` |
| `response` | `no_music` / `knew` / `did_not_know` |
| `correct` | `1` / `0` |
| `condition` | encoding condition |
| `rt_ms` | source RT |

---

## 5. Instructions that must stay in sync

Update welcome / break / recall intro text in PsychoPy to match `js/config.js`:

- Session length: **about 60 minutes**
- Consent screen before any task (Agree / Decline)
- Part 1 mentions F/J person count; the first press is boxed on screen
- Part 2 is the memory test (confidence and source-after-OLD)
- Part 3 is music ratings (keys 1–5, 3 seconds per question)
- The break after encoding (`breaks.afterEncoding`) leads into the memory test and states the recall keys
- The break after recall (`breaks.afterRecall`) leads into the survey

---

## 6. Verification checklist (PsychoPy vs online test run)

- [ ] Encoding: 108 trials; F/J person-count recorded; video duration unchanged when a key is pressed
- [ ] Orienting `correct` blank for ambiguous clips in the label file
- [ ] `mem_score` / `mem_alpha` present on encoding and recall rows
- [ ] Survey after recognition: 72 clips × 4 questions; same ids; timeout leaves response blank and `timed_out = 1`
- [ ] Survey music plays ~6 s
- [ ] Recall: 216 old/new RTs still measured on the recognition routine
- [ ] Confidence on every trial; source only after OLD
- [ ] Source scoring matches the table above for meam / control / no_music
- [ ] Column meanings match README “Data format” notes
- [ ] Instruction screens use the same key mappings and wording

---

## Online-only (do not port)

- Prolific URL params and completion redirect
- Desktop / mobile guard
- Pavlovia upload plugin
- `test.html` / `?test=` short session
- localStorage dropout backup
