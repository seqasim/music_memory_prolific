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
  const boxStyle =
    'border:4px solid #111;padding:14px 28px;border-radius:8px;display:inline-block;background:#f5f5f5;';
  const oldStyle = selectedLabel === 'old' ? boxStyle + 'margin-right:48px;' : 'margin-right:48px;';
  const newStyle = selectedLabel === 'new' ? boxStyle : '';

  return (
    '<p style="margin-top:24px;font-size:28px;">' +
    `<span style="${oldStyle}"><strong>← OLD</strong></span>` +
    `<span style="${newStyle}"><strong>NEW →</strong></span></p>`
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
    breakScreen(CONFIG.breaks.beforeRecall),
    instructionTrial(CONFIG.instructions.recallIntro),
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
 * One recall trial: fixation → video+OLD/NEW → confidence → [source if OLD].
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

  const confidence = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: () => {
      const last = jsPsych.data.get().last(1).values()[0];
      const responseLabel = last?.recall_response || recallResponseLabel(last?.response);
      return wrapHtml(buildRecallChoicePrompt(responseLabel) + CONFIG.confidencePrompt);
    },
    choices: confidenceChoices,
    response_ends_trial: true,
    on_finish: (data) => {
      const confLabel = confidenceResponseLabel(data.response);
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

  const source = {
    timeline: [
      {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: wrapHtml(CONFIG.sourcePrompt),
        choices: sourceChoices,
        response_ends_trial: true,
        on_finish: (data) => {
          const srcLabel = sourceResponseLabel(data.response);
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
    ],
    conditional_function: () => {
      const lastRecognition = jsPsych.data
        .get()
        .filter({ phase: 'recall', subphase: 'recognition' })
        .last(1)
        .values()[0];
      const responseLabel =
        lastRecognition?.recall_response || recallResponseLabel(lastRecognition?.response);
      return responseLabel === 'old';
    },
  };

  return {
    timeline: [fixation, videoAndResponse, confidence, source],
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
