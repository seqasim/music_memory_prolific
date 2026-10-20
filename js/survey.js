/**
 * survey.js — Survey phase timeline (rate each heard music clip)
 * ================================================================
 * Only music trials from encoding (MEAM + control) are surveyed.
 * Each clip gets questions defined in CONFIG.surveyQuestions
 * (slider | yes_no | dropdown).
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
    breakScreen(CONFIG.breaks.afterEncoding),
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
 * Build one survey question trial from a CONFIG.surveyQuestions entry.
 * @param {object} q
 * @param {object} trial
 * @param {number} clipIndex
 * @param {number} totalClips
 * @returns {object}
 */
function buildSurveyQuestionTrial(q, trial, clipIndex, totalClips) {
  const type = q.type || 'slider';
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
  const baseData = {
    phase: 'survey',
    subphase: 'rating',
    question: q.id,
    list_num: trial.listNum,
    clip_index: clipIndex,
    music_file: trial.musicPath,
  };

  if (type === 'yes_no') {
    return {
      type: jsPsychHtmlButtonResponse,
      stimulus: wrapHtml(header + `<p style="font-size:26px;margin-top:16px;">${q.text}</p>`),
      choices: ['Yes', 'No'],
      button_html: '<button class="jspsych-btn" style="margin:0 12px;min-width:120px;">%choice%</button>',
      on_finish: (data) => {
        const response = data.response === 0 ? 'yes' : data.response === 1 ? 'no' : '';
        DataSaver.logTrial({ ...baseLog, response, rt_ms: data.rt });
      },
      data: baseData,
    };
  }

  if (type === 'dropdown') {
    const options = q.options || [];
    const optionHtml = options
      .map((opt) => `<option value="${opt.value}">${opt.label}</option>`)
      .join('');
    return {
      type: jsPsychSurveyHtmlForm,
      preamble: wrapHtml(header + `<p style="font-size:26px;margin-top:16px;">${q.text}</p>`),
      html:
        '<p style="margin-top:16px;">' +
        `<select name="${q.id}" required style="font-size:22px;padding:10px;min-width:280px;">` +
        '<option value="" disabled selected>Select one…</option>' +
        optionHtml +
        '</select></p>',
      button_label: 'Continue',
      on_finish: (data) => {
        const response = (data.response && data.response[q.id]) || '';
        DataSaver.logTrial({ ...baseLog, response, rt_ms: data.rt });
      },
      data: baseData,
    };
  }

  // Default: slider
  const labels =
    q.labels && q.labels.length
      ? q.labels
      : Array.from(
          { length: CONFIG.surveyScaleMax - CONFIG.surveyScaleMin + 1 },
          (_, i) => String(CONFIG.surveyScaleMin + i)
        );

  return {
    type: jsPsychHtmlSliderResponse,
    stimulus: wrapHtml(header + `<p style="font-size:26px;margin-top:16px;">${q.text}</p>`),
    labels,
    min: CONFIG.surveyScaleMin,
    max: CONFIG.surveyScaleMax,
    step: CONFIG.surveyScaleStep,
    start: CONFIG.surveyDefaultValue,
    slider_width: CONFIG.surveySliderWidthPx,
    button_label: 'Continue',
    require_movement: true,
    on_finish: (data) => {
      DataSaver.logTrial({ ...baseLog, response: data.response, rt_ms: data.rt });
    },
    data: baseData,
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

  const ratingTrials = CONFIG.surveyQuestions.map((q) =>
    buildSurveyQuestionTrial(q, trial, clipIndex, totalClips)
  );

  return [preloadClip, playMusic, ...ratingTrials];
}

if (typeof window !== 'undefined') {
  window.buildSurveyTimeline = buildSurveyTimeline;
  window.buildSurveyQuestionTrial = buildSurveyQuestionTrial;
}
