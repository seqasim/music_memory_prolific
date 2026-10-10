/**
 * survey.js — Survey phase timeline (rate each heard music clip)
 * ================================================================
 * Only music trials from encoding (MEAM + control) are surveyed.
 * Each clip gets slider questions defined in CONFIG.surveyQuestions.
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
    trial_ends_after_audio: true,
    prompt: wrapHtml(
      `<p><strong>Clip ${clipIndex} of ${totalClips}</strong></p>` +
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

  const ratingTrials = CONFIG.surveyQuestions.map((q) => ({
    type: jsPsychHtmlSliderResponse,
    stimulus: wrapHtml(
      `<p><strong>Clip ${clipIndex} of ${totalClips}</strong></p>` +
        `<p style="font-size:26px;margin-top:16px;">${q.text}</p>`
    ),
    labels: Array.from(
      { length: CONFIG.surveyScaleMax - CONFIG.surveyScaleMin + 1 },
      (_, i) => String(CONFIG.surveyScaleMin + i)
    ),
    min: CONFIG.surveyScaleMin,
    max: CONFIG.surveyScaleMax,
    step: CONFIG.surveyScaleStep,
    start: CONFIG.surveyDefaultValue,
    slider_width: CONFIG.surveySliderWidthPx,
    button_label: 'Continue',
    require_movement: true,
    on_finish: (data) => {
      DataSaver.logTrial({
        phase: 'survey',
        list_num: trial.listNum,
        trial_num: clipIndex,
        condition: trial.condition,
        music_file: trial.musicPath,
        video_file: trial.sourceVideo,
        question: q.id,
        response: data.response,
        rt_ms: data.rt,
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
  }));

  return [preloadClip, playMusic, ...ratingTrials];
}

if (typeof window !== 'undefined') {
  window.buildSurveyTimeline = buildSurveyTimeline;
}
