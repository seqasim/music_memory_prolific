/**
 * survey.js — Survey phase timeline (rate each heard music clip)
 * ================================================================
 * Only music trials from encoding (MEAM + control) are surveyed.
 * Each clip gets CONFIG.surveyQuestions (click 1–5, 4 s timeout).
 * Runs after recognition so ratings do not re-expose music before source memory.
 */

/**
 * Build survey phase timeline.
 * @param {object} assignment
 * @returns {Array}
 */
function buildSurveyTimeline(assignment) {
  const musicTrials = assignment.surveyTrials.map((trial, index) => ({
    timeline: buildSurveyClipTimeline(trial, index + 1, assignment.surveyTrials.length),
  }));

  return [
    breakScreen(CONFIG.breaks.afterRecall),
    ...buildAudioCheckTimeline(),
    instructionTrial(CONFIG.instructions.surveyIntro),
    ...musicTrials,
    {
      type: jsPsychCallFunction,
      func: () => DataSaver.checkpoint('survey_complete'),
    },
  ];
}

/**
 * Clip header shown above every question for a clip.
 * @param {number} clipIndex
 * @param {number} totalClips
 * @returns {string}
 */
function surveyClipHeader(clipIndex, totalClips) {
  return `<p><strong>Clip ${clipIndex} of ${totalClips}</strong></p>`;
}

/**
 * End labels aligned to CONFIG.surveyScaleValues.
 * @param {object} q
 * @returns {string[]}
 */
function surveyEndLabels(q) {
  return q.labels && q.labels.length === CONFIG.surveyScaleValues.length
    ? q.labels
    : CONFIG.surveyScaleValues.map(() => '');
}

/**
 * Button inner HTML for one scale point, with an optional end label.
 * @param {object} q
 * @param {number} value
 * @param {number} index
 * @returns {string}
 */
function surveyChoiceHtml(q, value, index) {
  const caption = surveyEndLabels(q)[index];
  const label = caption
    ? `<span class="survey-end-label">${caption}</span>`
    : '';
  return `${value}${label}`;
}

/**
 * Static 1–5 row used to box the clicked value after a response.
 * @param {object} q
 * @param {number|string} selectedValue
 * @returns {string}
 */
function surveyFeedbackHtml(q, selectedValue) {
  const boxes = CONFIG.surveyScaleValues
    .map((value, index) => {
      const selected = String(selectedValue) === String(value) ? ' selected' : '';
      const caption = surveyEndLabels(q)[index]
        ? `<div style="font-size:15px;margin-top:8px;line-height:1.25;">${surveyEndLabels(q)[index]}</div>`
        : '';
      return (
        '<div style="flex:1 1 0;min-width:0;text-align:center;">' +
        `<div class="orient-choice${selected}" style="display:block;"><strong>${value}</strong></div>` +
        caption +
        '</div>'
      );
    })
    .join('');
  return (
    `<p style="font-size:26px;margin-top:16px;">${q.text}</p>` +
    `<div style="display:flex;justify-content:center;gap:10px;max-width:640px;margin:24px auto 0;">${boxes}</div>`
  );
}

/**
 * Instruction plus shrinking countdown, shown under the buttons.
 * @returns {string}
 */
function surveyTimerPrompt() {
  const seconds = CONFIG.surveyQuestionTimeoutMs / 1000;
  return responseTimerPrompt(
    CONFIG.surveyQuestionTimeoutMs,
    `Click 1–5. This question moves on after ${seconds} seconds.`
  );
}

/**
 * Build one survey question trial from a CONFIG.surveyQuestions entry.
 * @param {object} q
 * @param {object} trial
 * @param {number} clipIndex
 * @param {number} totalClips
 * @returns {object}
 */
function buildSurveyQuestionTrial(q, trial, clipIndex, totalClips) {
  const header = surveyClipHeader(clipIndex, totalClips);
  const baseLog = {
    phase: 'survey',
    list_num: trial.listNum,
    trial_num: clipIndex,
    condition: trial.condition,
    music_file: trial.musicPath,
    video_file: trial.sourceVideo,
    question: q.id,
  };

  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: wrapHtml(header + `<p style="font-size:26px;margin-top:16px;">${q.text}</p>`),
    prompt: surveyTimerPrompt(),
    choices: CONFIG.surveyScaleValues.map((value, index) => surveyChoiceHtml(q, value, index)),
    button_html: '<button class="jspsych-btn survey-choice-btn">%choice%</button>',
    trial_duration: CONFIG.surveyQuestionTimeoutMs,
    response_ends_trial: true,
    on_finish: (data) => {
      const timedOut = data.response == null;
      const value = timedOut ? '' : String(CONFIG.surveyScaleValues[data.response]);
      data.survey_timed_out = timedOut ? 1 : 0;
      data.survey_value = value;
      noteTaskResponse(!timedOut);
      DataSaver.logTrial({
        ...baseLog,
        response: value,
        rt_ms: timedOut ? '' : data.rt,
        timed_out: timedOut ? 1 : 0,
      });
    },
    data: {
      phase: 'survey',
      subphase: 'rating',
      question: q.id,
      list_num: trial.listNum,
      clip_index: clipIndex,
      music_file: trial.musicPath,
    },
  };
}

/**
 * 400 ms boxed hold after a click. Skipped when the question times out.
 * @param {object} q
 * @param {object} trial
 * @param {number} clipIndex
 * @param {number} totalClips
 * @returns {object}
 */
function buildSurveyFeedbackTrial(q, trial, clipIndex, totalClips) {
  return {
    timeline: [
      choiceFeedbackTrial(() => {
        const last = jsPsych.data
          .get()
          .filter({ phase: 'survey', subphase: 'rating', question: q.id })
          .last(1)
          .values()[0];
        return wrapHtml(
          surveyClipHeader(clipIndex, totalClips) + surveyFeedbackHtml(q, last?.survey_value)
        );
      }),
    ],
    conditional_function: () => {
      const last = jsPsych.data
        .get()
        .filter({ phase: 'survey', subphase: 'rating', question: q.id })
        .last(1)
        .values()[0];
      return !!last && last.survey_timed_out !== 1;
    },
  };
}

/**
 * Timeline for one music clip + ratings.
 * @param {object} trial
 * @param {number} clipIndex
 * @param {number} totalClips
 * @returns {Array}
 */
function buildSurveyClipTimeline(trial, clipIndex, totalClips) {
  const preloadClip = {
    type: jsPsychPreload,
    auto_preload: false,
    message: `Loading clip ${clipIndex} of ${totalClips}...`,
    audio: [trial.musicPath],
    show_progress_bar: true,
    show_detailed_errors: true,
  };

  const playMusic = {
    type: jsPsychAudioKeyboardResponse,
    stimulus: trial.musicPath,
    choices: 'NO_KEYS',
    trial_ends_after_audio: false,
    trial_duration: CONFIG.surveyMusicMs,
    prompt: wrapHtml(
      surveyClipHeader(clipIndex, totalClips) +
        '<p style="font-size:28px;margin-top:24px;">♪ Playing music…</p>'
    ),
    on_finish: (data) => {
      DataSaver.logTrial({
        phase: 'survey',
        list_num: trial.listNum,
        trial_num: clipIndex,
        condition: trial.condition,
        music_file: trial.musicPath,
        video_file: trial.sourceVideo,
        question: 'music_replay',
        response: 'played',
        rt_ms: data.rt,
      });
    },
    data: {
      phase: 'survey',
      subphase: 'music_replay',
      list_num: trial.listNum,
      clip_index: clipIndex,
      total_clips: totalClips,
      music_file: trial.musicPath,
    },
  };

  const ratingTrials = CONFIG.surveyQuestions.flatMap((q) => [
    buildSurveyQuestionTrial(q, trial, clipIndex, totalClips),
    buildSurveyFeedbackTrial(q, trial, clipIndex, totalClips),
  ]);

  return [preloadClip, playMusic, ...ratingTrials];
}

if (typeof window !== 'undefined') {
  window.buildSurveyTimeline = buildSurveyTimeline;
  window.buildSurveyQuestionTrial = buildSurveyQuestionTrial;
  window.surveyFeedbackHtml = surveyFeedbackHtml;
}
