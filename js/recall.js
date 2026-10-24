/**
 * recall.js — Recall phase timeline (old/new recognition + confidence + source)
 * =============================================================================
 * 9 lists × 24 videos. LEFT = OLD, RIGHT = NEW (matches original PsychoPy task).
 * After each old/new response: confidence (1/2/3). After OLD only: source (1/2/3).
 */

/**
 * OLD/NEW prompt HTML; optionally highlight the selected response.
 * @param {'old'|'new'|''} selectedLabel
 * @returns {string}
 */
function buildRecallChoicePrompt(selectedLabel) {
  const oldClass = selectedLabel === 'old' ? 'orient-choice selected' : 'orient-choice';
  const newClass = selectedLabel === 'new' ? 'orient-choice selected' : 'orient-choice';

  return (
    '<p style="margin-top:24px;font-size:28px;">' +
    `<span class="${oldClass}" style="margin-right:48px;"><strong>← OLD</strong></span>` +
    `<span class="${newClass}"><strong>NEW →</strong></span></p>`
  );
}

/**
 * Most recent recall trial of a subphase.
 * @param {string} subphase
 * @returns {object|undefined}
 */
function lastRecallSubphase(subphase) {
  return jsPsych.data.get().filter({ phase: 'recall', subphase }).last(1).values()[0];
}

/**
 * OLD/NEW label from the latest recognition trial.
 * @returns {'old'|'new'|''}
 */
function lastRecognitionLabel() {
  const last = lastRecallSubphase('recognition');
  return last?.recall_response || recallResponseLabel(last?.response) || '';
}

/**
 * Confidence prompt, with the pressed key boxed when selectedKey is set.
 * @param {string} selectedKey
 * @returns {string}
 */
function confidencePromptHtml(selectedKey) {
  return (
    '<p style="font-size:28px;margin-top:24px;"><strong>How sure are you?</strong></p>' +
    choiceRowHtml(CONFIG.confidenceOptions, selectedKey || '')
  );
}

/**
 * Source prompt, stacked, with the pressed key boxed when selectedKey is set.
 * @param {string} selectedKey
 * @returns {string}
 */
function sourcePromptHtml(selectedKey) {
  return (
    '<p style="font-size:28px;margin-top:24px;"><strong>When you saw this video, was there:</strong></p>' +
    choiceRowHtml(CONFIG.sourceOptions, selectedKey || '', 'column')
  );
}

/**
 * Map jsPsych key response to old/new label (case-insensitive).
 * @param {string} response
 * @returns {'old'|'new'|''}
 */
function recallResponseLabel(response) {
  const key = response?.toLowerCase();
  if (key === CONFIG.recallKeys.old.toLowerCase()) return 'old';
  if (key === CONFIG.recallKeys.new.toLowerCase()) return 'new';
  return '';
}

/**
 * Map confidence key (1/2/3) to label.
 * @param {string} response
 * @returns {string}
 */
function confidenceResponseLabel(response) {
  const key = String(response ?? '');
  return CONFIG.confidenceKeys[key] || '';
}

/**
 * Map source key (1/2/3) to label.
 * @param {string} response
 * @returns {string}
 */
function sourceResponseLabel(response) {
  const key = String(response ?? '');
  return CONFIG.sourceKeys[key] || '';
}

/**
 * Expected source label from encoding condition.
 * meam → knew; control_music → did_not_know; no_music → no_music.
 * @param {string} condition
 * @returns {string}
 */
function expectedSourceLabel(condition) {
  if (condition === 'meam') return 'knew';
  if (condition === 'control_music') return 'did_not_know';
  if (condition === 'no_music') return 'no_music';
  return '';
}

/**
 * Build recall phase timeline.
 * @param {object} assignment
 * @param {Array<string>} recallVideoPaths - optional preload list
 * @returns {Array}
 */
function buildRecallTimeline(assignment, recallVideoPaths) {
  const trialsByList = {};
  assignment.recallTrials.forEach((trial) => {
    if (!trialsByList[trial.listNum]) trialsByList[trial.listNum] = [];
    trialsByList[trial.listNum].push(trial);
  });

  const preloadNode =
    CONFIG.preloadRecallDuringBreak && recallVideoPaths?.length
      ? {
          type: jsPsychPreload,
          auto_preload: false,
          message: 'Loading memory test videos...',
          videos: recallVideoPaths,
          show_progress_bar: true,
        }
      : null;

  const listTimelines = Object.keys(trialsByList)
    .sort((a, b) => Number(a) - Number(b))
    .map((listNum) => {
      const listTrials = trialsByList[listNum];
      return {
        timeline: [
          listStartTrial(`Memory test — block ${listNum} of ${CONFIG.numLists}`),
          ...listTrials.map((trial) => buildRecallTrial(trial)),
          {
            type: jsPsychCallFunction,
            func: () => DataSaver.checkpoint(`recall_list_${listNum}`),
          },
        ],
      };
    });

  const nodes = [
    breakScreen(CONFIG.breaks.afterEncoding),
  ];
  if (preloadNode) nodes.push(preloadNode);
  nodes.push({ timeline: listTimelines });
  nodes.push({
    type: jsPsychCallFunction,
    func: () => DataSaver.checkpoint('recall_complete'),
  });

  return nodes;
}

/**
 * One recall trial: fixation → video+OLD/NEW → boxed hold → confidence →
 * boxed hold → [source → boxed hold if OLD].
 * Confidence and source are logged as separate rows (question column).
 * @param {object} trial
 * @returns {object}
 */
function buildRecallTrial(trial) {
  const oldKey = CONFIG.recallKeys.old;
  const newKey = CONFIG.recallKeys.new;
  const confidenceChoices = Object.keys(CONFIG.confidenceKeys);
  const sourceChoices = Object.keys(CONFIG.sourceKeys);

  const fixation = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: fixationHtml(),
    choices: 'NO_KEYS',
    trial_duration: CONFIG.recallFixationMs,
    data: {
      phase: 'recall',
      subphase: 'fixation',
      list_num: trial.listNum,
      trial_num: trial.trialNum,
      video_file: trial.videoPath,
      is_old: trial.isOld ? 1 : 0,
      condition: trial.encodingCondition || '',
    },
  };

  const videoAndResponse = {
    type: jsPsychVideoKeyboardResponse,
    stimulus: [trial.videoPath],
    choices: [oldKey, newKey],
    controls: false,
    trial_ends_after_video: true,
    width: 800,
    height: 450,
    prompt: wrapHtml(buildRecallChoicePrompt('')),
    response_ends_trial: true,
    on_finish: (data) => {
      const responseLabel = recallResponseLabel(data.response);
      const correct =
        (trial.isOld && responseLabel === 'old') || (!trial.isOld && responseLabel === 'new');

      data.recall_response = responseLabel;

      DataSaver.logTrial({
        phase: 'recall',
        list_num: trial.listNum,
        trial_num: trial.trialNum,
        video_file: trial.videoPath,
        condition: trial.encodingCondition || '',
        is_old: trial.isOld ? 1 : 0,
        response: responseLabel,
        correct: correct ? 1 : 0,
        rt_ms: data.rt,
        mem_score: trial.memScore ?? '',
        mem_alpha: trial.memAlpha ?? '',
      });
    },
    data: {
      phase: 'recall',
      subphase: 'recognition',
      list_num: trial.listNum,
      trial_num: trial.trialNum,
      video_file: trial.videoPath,
      is_old: trial.isOld ? 1 : 0,
      condition: trial.encodingCondition || '',
    },
  };

  const recognitionFeedback = choiceFeedbackTrial(() =>
    wrapHtml(buildRecallChoicePrompt(lastRecognitionLabel()))
  );

  const confidence = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: () => wrapHtml(buildRecallChoicePrompt(lastRecognitionLabel()) + confidencePromptHtml('')),
    choices: confidenceChoices,
    response_ends_trial: true,
    on_finish: (data) => {
      const confLabel = confidenceResponseLabel(data.response);
      data.confidence_key = data.response;
      data.confidence_label = confLabel;
      DataSaver.logTrial({
        phase: 'recall',
        list_num: trial.listNum,
        trial_num: trial.trialNum,
        video_file: trial.videoPath,
        condition: trial.encodingCondition || '',
        is_old: trial.isOld ? 1 : 0,
        question: 'confidence',
        response: confLabel,
        rt_ms: data.rt,
        mem_score: trial.memScore ?? '',
        mem_alpha: trial.memAlpha ?? '',
      });
    },
    data: {
      phase: 'recall',
      subphase: 'confidence',
      list_num: trial.listNum,
      trial_num: trial.trialNum,
      video_file: trial.videoPath,
      is_old: trial.isOld ? 1 : 0,
      condition: trial.encodingCondition || '',
    },
  };

  const confidenceFeedback = choiceFeedbackTrial(() => {
    const last = lastRecallSubphase('confidence');
    return wrapHtml(
      buildRecallChoicePrompt(lastRecognitionLabel()) + confidencePromptHtml(last?.confidence_key || '')
    );
  });

  const source = {
    timeline: [
      {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: wrapHtml(sourcePromptHtml('')),
        choices: sourceChoices,
        response_ends_trial: true,
        on_finish: (data) => {
          const srcLabel = sourceResponseLabel(data.response);
          data.source_key = data.response;
          const expected = expectedSourceLabel(trial.encodingCondition);
          const sourceCorrect =
            expected && srcLabel ? (srcLabel === expected ? 1 : 0) : '';

          DataSaver.logTrial({
            phase: 'recall',
            list_num: trial.listNum,
            trial_num: trial.trialNum,
            video_file: trial.videoPath,
            condition: trial.encodingCondition || '',
            is_old: trial.isOld ? 1 : 0,
            question: 'source',
            response: srcLabel,
            correct: sourceCorrect,
            rt_ms: data.rt,
            mem_score: trial.memScore ?? '',
            mem_alpha: trial.memAlpha ?? '',
          });
        },
        data: {
          phase: 'recall',
          subphase: 'source',
          list_num: trial.listNum,
          trial_num: trial.trialNum,
          video_file: trial.videoPath,
          is_old: trial.isOld ? 1 : 0,
          condition: trial.encodingCondition || '',
        },
      },
      choiceFeedbackTrial(() => {
        const last = lastRecallSubphase('source');
        return wrapHtml(sourcePromptHtml(last?.source_key || ''));
      }),
    ],
    conditional_function: () => lastRecognitionLabel() === 'old',
  };

  return {
    timeline: [fixation, videoAndResponse, recognitionFeedback, confidence, confidenceFeedback, source],
  };
}

if (typeof window !== 'undefined') {
  window.buildRecallTimeline = buildRecallTimeline;
  window.buildRecallChoicePrompt = buildRecallChoicePrompt;
  window.recallResponseLabel = recallResponseLabel;
  window.confidenceResponseLabel = confidenceResponseLabel;
  window.sourceResponseLabel = sourceResponseLabel;
  window.expectedSourceLabel = expectedSourceLabel;
}
