# PsychoPy porting guide — SRE-aligned task changes

Use this document to mirror the online (jsPsych) revisions in
`DIODE_music_memory_{ENCODING,SURVEY,RECALL}.psyexp`. Wording and keys below
are copied from the online task so both versions stay aligned.

Online files touched for these changes:

- `js/config.js` — keys, prompts, survey items, instructions, session length
- `js/encoding.js` — person-count orienting during video
- `js/survey.js` — slider / yes_no / dropdown question types
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

## 2. Survey: revised items and response types

### Rationale

Separates autobiographical salience from familiarity, earworm quality, age at
first exposure, recent exposure, and affect (valence/arousal).

### Trial flow (unchanged structure)

`preload → play music (6 s) → Q1 → Q2 → … → Q12`

### Question table (paste into a conditions file)

| id | type | text | labels / options |
|----|------|------|------------------|
| familiarity | slider | How familiar are you with this music? | Not at all … Extremely |
| specific_memory | yes_no | Did this song bring back a specific memory from your own life? | Yes / No |
| reliving | slider | How vividly did you mentally relive past experiences while hearing this song? | Not at all … Extremely |
| self_relevance | slider | While listening to this song, how much were you thinking about yourself or your own life? | Not at all … Extremely |
| age_first_heard | dropdown | Roughly how old were you when you first heard this song? | never; under_10; 10_14; 15_19; 20_24; 25_29; 30_plus |
| recent_exposure | slider | How often have you heard this song in the past year? | Never … Very often |
| earworm | slider | How catchy is this song (likely to get stuck in your head)? | Not at all … Extremely |
| liking | slider | How much do you like this music? | Not at all … Extremely |
| valence | slider | How pleasant or unpleasant did this song feel? | Unpleasant … Pleasant |
| arousal | slider | How calming or energizing did this song feel? | Calming … Energizing |
| distraction | slider | During the video, how distracting did you find the music? | Not at all … Extremely |
| novelty | slider | How novel or unexpected did you find this song? | Not at all … Extremely |

**Dropped vs prior online task:** `memory_strength` (merged into reliving),
`engagement`, `emotionally_moving` (replaced by valence + arousal).

**No free-text** follow-up for `specific_memory`.

### PsychoPy mapping

- Sliders: Rating Scale / Slider, 1–5, require response, show end labels.
- Yes/No: two mouse buttons or keys (`y`/`n`), store `yes`/`no`.
- Dropdown: Form / dropdown, required; store value codes above
  (`never`, `under_10`, …).

Music duration: first 6 s only (online uses `trial_duration: 6000`, not full file).

### Data output

| Field | Value |
|-------|--------|
| `phase` | `survey` |
| `question` | item `id` (or `music_replay` for the play row) |
| `response` | 1–5 for sliders; `yes`/`no`; dropdown value string |

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

- Session length: **75–90 minutes**
- Part 1 mentions F/J person count
- Part 2 mentions sliders, Yes/No, dropdown
- Part 3 mentions confidence and source-after-OLD
- `beforeRecall` break text mentions confidence + source

---

## 6. Verification checklist (PsychoPy vs online test run)

- [ ] Encoding: 108 trials; F/J person-count recorded; video duration unchanged when a key is pressed
- [ ] Orienting `correct` blank for ambiguous clips in the label file
- [ ] `mem_score` / `mem_alpha` present on encoding and recall rows
- [ ] Survey: 72 clips × 12 questions; same ids and option codes
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
