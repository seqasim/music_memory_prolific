# How task changes address summary-statement critiques

Grant-ready notes for the resubmission. Critiques are quoted from the
1R01AG100173-01 summary statement. Each entry links the critique to a concrete
change in the online Music Memory task and to the facilitate / interfere / gate
accounts of music-evoked self-reference.

Implementation details for porting to PsychoPy are in
[`PSYCHOPY_PORTING.md`](PSYCHOPY_PORTING.md).

---

## Competing accounts (predictions)

Under the revised framework, autobiographically salient music may induce a
self-referential processing state that **facilitates**, **interferes with**, or
**gates** new encoding as a function of salience (and, in Aim 1, age).

Expected pattern across the new measures:

| Account | Recollection (from confidence ROC / DPSD) | Familiarity | Source (music–video binding) | Encoding cost (person-count RT & accuracy) |
|---------|-------------------------------------------|-------------|------------------------------|-----------------------------------------------|
| **Facilitate** | Higher for MEAM (esp. high self-relevance) than control / no music | Little change or modest increase | Higher for MEAM | Little cost, or faster/more accurate on MEAM |
| **Interfere** | Lower or unchanged for MEAM | May be intact | Lower for MEAM (poor binding) | Greater cost on MEAM; cost scales with self-relevance / specific_memory |
| **Gate** | Benefit only at moderate salience; null or cost at very high salience | Variable | Binding tracks the same non-monotonic pattern | Cost largest at high salience; memory benefit at mid-range |

---

## Critique-by-critique mapping

### 1. Recollection vs familiarity; guessing (Reviewer 3)

> “Memory performance (a primary outcome variable across studies) is broadly
> operationalized and may not capture subtle effects of music on memory. For
> example, recognition memory is measured through yes/no responses that do not
> account for guessing or enable distinctions between responses based on
> recollection and familiarity.”

**Task change:** After every old/new decision, participants rate confidence
(1 = Sure, 2 = Maybe, 3 = Guess). Combined with old/new, this yields a 6-point
scale for ROC analysis and dual-process signal-detection (DPSD) estimates of
recollection and familiarity.

**What it measures:** Separate recollection and familiarity; guessing is
modeled rather than ignored. Old/new RT remains on the recognition screen for
drift-diffusion modeling.

**SRE link:** The canonical self-reference effect selectively boosts
recollection (“remember”) more than familiarity. Facilitation predicts higher
recollection for MEAM; interference predicts a cost primarily in recollection;
gating predicts a non-monotonic recollection pattern over rated salience.

---

### 2. Earworm quality and age at first listen (Reviewer 1)

> “It is unclear how autobiographical salience will be distinguished from
> ‘earworm’ qualities or age at first listen.”

**Task change:** Survey items `earworm` (“How catchy is this song…”) and
`age_first_heard` (dropdown including “Never heard it” and age bands).

**What it measures:** Per-song catchiness and approximate age of first exposure,
usable as covariates or mediators alongside condition.

**SRE link:** Effects that survive covarying earworm and age-at-first-listen
are more attributable to self-referential / autobiographical processing than to
mere catchiness or reminiscence-bump timing alone.

---

### 3. “Simply more richly associated” (Reviewer 1)

> Overarching hypothesis that autobiographically salient music engages “distinct
> neural states” is undersupported relative to alternative explanations such as
> that autobiographically salient stimuli are simply more richly associated than
> other memoranda.

Also related: “It is unclear how biomarkers of autobiographical salience will be
distinguished from biomarkers of richness or extent of recall.”

**Task change:** (a) Source-memory question after OLD responses
(no music / music you knew / music you did not know), scored against encoding
condition; (b) binary `specific_memory` (Yes/No) per song as a participant-level
MEAM flag (no free text).

**What it measures:** Item memory (old/new + confidence) vs binding of video to
music context (source). Per-song autobiographical instantiation vs cohort-norm
MEAM labels.

**SRE link:** Better source without better item memory supports richer
association/binding; item-only gains without source gains favor generic
strength. Interference predicts intact or worse item memory with worse binding;
facilitation/gating predict better binding when self-reference supports
encoding of the episode.

---

### 4. Affect, familiarity, and interest in control music (Reviewer 2)

> “While the control music is matched quite well on many acoustic dimensions,
> they are lacking control on many other features that could confound the
> interpretation of the results. Features like evoked affect (even in a naïve
> sample), general familiarity, and interest are not assessed for or controlled
> for.”

**Task change:** Trial-level covariates retained or added: `familiarity`,
`recent_exposure`, `liking`, `novelty`, `valence`, `arousal` (valence/arousal
replace the former undifferentiated “emotionally moving” item).

**What it measures:** Subjective familiarity (lifetime and past-year),
preference/interest, and dimensional affect for every surveyed clip.

**SRE link:** Condition effects and self-relevance mediation that remain after
these covariates are harder to attribute to affect or familiarity alone.
`recent_exposure` specifically separates current familiarity from formative
autobiographical links.

**Partially related, out of scope for this task revision:** Reviewer 2 also
suggested contemporaneous “music they are listening to currently” as a tighter
control condition. That structural condition was not added here; covariates
address the measurement gap without changing the three-condition design.

---

### 5. Retrieval competing with encoding (Reviewer 2)

> “…there is a large body of research that shows that the retrieval of memories
> can actually interfere with new encoding and/or consolidation… neurobiological
> models of hippocampal function shows that there are oppositional states in the
> hippocampus for encoding and consolidation/retrieval…”

**Task change:** Speeded person-count judgment (F = one person or fewer,
J = more than one person) during every encoding video; RT and accuracy logged;
accuracy scored against `stimuli/encoding_video_labels.json` derived from
Memento10k captions (ambiguous → unscored). Intrinsic video memorability
(`mem_score`, `mem_alpha` from Memento10k) is stored as a trial-level covariate.

**What it measures:** Online encoding cost concurrent with music exposure;
separable from how memorable the clip is in the Memento norms.

**SRE link:** Interference predicts greater cost on MEAM (and with higher
`self_relevance` / `specific_memory` = yes). Facilitation predicts little cost
or a benefit. Gating predicts cost that rises with salience while memory
benefits only in a mid-range of salience. Covarying `mem_score` addresses the
possibility that condition effects track clip memorability rather than music.

---

### 6. Participants ignoring music or videos (Reviewer 3)

The Approach notes an Aim 1a pitfall that participants might ignore background
music during encoding, yielding null music effects.

**Task change:** Person-count orienting requires attending to the video; survey
`distraction` rating captures perceived music distraction during the video.

**What it measures:** Compliance / attention (orienting response rate and
accuracy) and subjective distraction.

**SRE link:** Allows exclusion or covariate adjustment for non-compliant
participants and tests whether distraction mediates condition effects on memory.

---

### 7. Drift-diffusion features (Reviewer 2)

> “The drift diffusion modeling of the memory data is a nice addition; however,
> the different features of this modeling approach were not fully incorporated
> into the analysis plans…”

**Task change:** Old/new RT remains measured on the recognition response (not
contaminated by confidence). Confidence is available as a separate measure for
threshold / evidence-quality extensions of the DDM.

**What it measures:** Clean choice RT for drift rate / boundary analyses;
confidence for decision certainty.

**SRE link:** Facilitation vs interference can appear as changes in drift rate
for MEAM vs control; confidence constrains interpretations of criterion shifts.

---

## Critiques not addressed by these task changes

Handled elsewhere in the resubmission (theory, aims, analysis, or team) or
deliberately out of scope for the online task:

| Critique | Where handled |
|----------|----------------|
| Underspecified theory; retrieval should not automatically help encoding | Revised self-reference framework (Introduction); competing accounts above |
| Uniqueness of music vs other autobiographical cues | Music positioned as tractable inducer of self-reference, not the mechanism itself |
| Recruitment across many age bins / order confounds | Aim 1 sampling / analysis plan (not a task-structure change) |
| Scope / timeframe across Aims 2–3 (iEEG, sleep TMR) | Aims refinement and feasibility text |
| mPFC vs lateral PFC coverage in iEEG | Aim 2 neural targeting language |
| Defining reactivation vs noise | Aim 2/3 analysis clarification |
| Contemporaneous “music listening now” control condition | Deferred; addressed partially via survey covariates (see §4) |
| Delayed (24 h) recognition | Deferred (Tier 3); not in current online session |
| Sex / race–ethnicity inclusion justification | Inclusion plans (admin), not task logic |

---

## One-paragraph summary for Approach text

To align the paradigm with the self-reference framework and address critiques of
the recognition measure and music controls, we revised the online Music Memory
task in four ways. First, each old/new decision is followed by a three-level
confidence rating, enabling ROC and dual-process estimates of recollection and
familiarity and accounting for guessing. Second, after “old” responses,
participants report whether the video had been paired with no music, familiar
music, or unfamiliar music, separating item memory from music–video binding.
Third, the post-encoding music survey now includes per-song measures of
specific autobiographical memory, age at first exposure, recent exposure,
earworm quality, valence, and arousal (alongside familiarity, liking,
self-relevance, reliving, distraction, and novelty), which enter models as
covariates. Fourth, during encoding participants make a speeded person-count judgment
(one person or fewer vs more than one), providing a trial-level index of the
cost of concurrent processing and an attention check; video clips are from
Memento10k so normative memorability scores can be entered as covariates.
Together these measures yield falsifiable signatures of facilitation,
interference, and gating without assuming that music-evoked autobiographical
retrieval necessarily improves new learning.
