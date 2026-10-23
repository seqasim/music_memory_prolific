/**
 * survey.js — Survey phase timeline (rate each heard music clip)
 * ================================================================
 * Only music trials from encoding (MEAM + control) are surveyed.
 * Each clip gets CONFIG.surveyQuestions (key_scale: press 1–5, 3 s timeout).
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
 * 1–5 scale with end labels and a shrinking countdown bar.
 * @param {object} q
 * @returns {string}
 */
function surveyScaleHtml(q) {
  const labels = q.labels && q.labels.length === CONFIG.surveyResponseKeys.length
    ? q.labels
    : CONFIG.surveyResponseKeys.map(() => '');
  const boxes = CONFIG.surveyResponseKeys
    .map((key, index) => {
      const caption = labels[index]
        ? `<div style="font-size:15px;margin-top:8px;line-height:1.25;">${labels[index]}</div>`
        : '';
      return (
        '<div style="flex:1 1 0;min-width:0;text-align:center;">' +
        `<div style="border:2px solid #111;border-radius:8px;padding:10px 0;font-size:28px;font-weight:bold;">${key}</div>` +
        caption +
        '</div>'
      );
    })
    .join('');
  const seconds = CONFIG.surveyQuestionTimeoutMs / 1000;

  return (
    `<p style="font-size:26px;margin-top:16px;">${q.text}</p>` +
    `<div style="display:flex;justify-content:center;gap:10px;max-width:640px;margin:24px auto 0;">${boxes}</div>` +
    `<p style="font-size:18px;margin-top:18px;">Press 1–5. This question moves on after ${seconds} seconds.</p>` +
    '<div class="survey-timer-track">' +
    `<div class="survey-timer-bar" style="animation-duration:${CONFIG.surveyQuestionTimeoutMs}ms;"></div>` +
    '</div>'
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
    type: jsPsychHtmlKeyboardResponse,
    stimulus: wrapHtml(header + surveyScaleHtml(q)),
    choices: CONFIG.surveyResponseKeys,
    trial_duration: CONFIG.surveyQuestionTimeoutMs,
    response_ends_trial: true,
    on_finish: (data) => {
      const timedOut = data.response == null;
      DataSaver.logTrial({
        ...baseLog,
        response: timedOut ? '' : data.response,
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
