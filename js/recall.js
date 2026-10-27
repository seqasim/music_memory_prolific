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
  const labels = ['OLD', 'NEW'];
  const selectedIndex = selectedLabel === 'old' ? 0 : selectedLabel === 'new' ? 1 : -1;
  return (
    '<p style="font-size:28px;margin-top:24px;"><strong>Was this video</strong></p>' +
    clickChoiceRowHtml(labels, selectedIndex)
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
  const labels = CONFIG.confidenceOptions.map((opt) => opt.label);
  const selectedIndex = CONFIG.confidenceOptions.findIndex((opt) => opt.key === selectedKey);
  return (
    '<p style="font-size:28px;margin-top:24px;"><strong>How sure are you?</strong></p>' +
    clickChoiceRowHtml(labels, selectedIndex)
  );
}

/**
 * Source prompt, stacked, with the pressed key boxed when selectedKey is set.
 * @param {string} selectedKey
 * @returns {string}
 */
function sourcePromptHtml(selectedKey) {
  const labels = CONFIG.sourceOptions.map((opt) => opt.label);
  const selectedIndex = CONFIG.sourceOptions.findIndex((opt) => opt.key === selectedKey);
  return (
    '<p style="font-size:28px;margin-top:24px;"><strong>When you saw this video, was there:</strong></p>' +
    clickChoiceRowHtml(labels, selectedIndex, 'column')
  );
}

/**
 * Map jsPsych key response to old/new label (case-insensitive).
 * @param {string} response
 * @returns {'old'|'new'|''}
 */
function recallResponseLabel(response) {
  if (response === 0) return 'old';
  if (response === 1) return 'new';
  const key = response?.toLowerCase?.();
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
  if (typeof response === 'number') {
    const opt = CONFIG.confidenceOptions[response];
    return opt ? CONFIG.confidenceKeys[opt.key] || '' : '';
  }
  const key = String(response ?? '');
  return CONFIG.confidenceKeys[key] || '';
}

/**
 * Map source key (1/2/3) to label.
 * @param {string} response
 * @returns {string}
 */
function sourceResponseLabel(response) {
  if (typeof response === 'number') {
    const opt = CONFIG.sourceOptions[response];
    return opt ? CONFIG.sourceKeys[opt.key] || '' : '';
  }
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
 * boxed hold → [music question for 2 s if OLD, otherwise a 2 s fixation].
 * Confidence and source are logged as separate rows (question column).
 * @param {object} trial
 * @returns {object}
 */
function buildRecallTrial(trial) {
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
    type: jsPsychVideoButtonResponse,
    stimulus: [trial.videoPath],
    choices: ['OLD', 'NEW'],
    button_html: choiceButtonHtml(),
    controls: false,
    trial_ends_after_video: true,
    trial_duration: CONFIG.responseTimeoutMs,
    width: 800,
    height: 450,
    prompt: responseTimerPrompt(
      CONFIG.responseTimeoutMs,
      'Click OLD or NEW. This moves on after 3 seconds.'
    ),
    response_ends_trial: true,
    on_finish: (data) => {
      const responseLabel = recallResponseLabel(data.response);
      const timedOut = !responseLabel;
      const correct = timedOut
        ? ''
        : (trial.isOld && responseLabel === 'old') || (!trial.isOld && responseLabel === 'new')
          ? 1
          : 0;

      data.recall_response = responseLabel;
      noteTaskResponse(!timedOut);

      DataSaver.logTrial({
        phase: 'recall',
        list_num: trial.listNum,
        trial_num: trial.trialNum,
        video_file: trial.videoPath,
        condition: trial.encodingCondition || '',
        is_old: trial.isOld ? 1 : 0,
        response: responseLabel,
        correct,
        rt_ms: timedOut ? '' : data.rt,
        timed_out: timedOut ? 1 : 0,
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

  const recognitionFeedback = {
    timeline: [
      choiceFeedbackTrial(() => wrapHtml(buildRecallChoicePrompt(lastRecognitionLabel()))),
    ],
    conditional_function: () => !!lastRecognitionLabel(),
  };

  const confidence = {
    type: jsPsychHtmlButtonResponse,
    stimulus: () =>
      wrapHtml(
        buildRecallChoicePrompt(lastRecognitionLabel()) +
          '<p style="font-size:28px;margin-top:24px;"><strong>How sure are you?</strong></p>'
      ),
    prompt: responseTimerPrompt(
      CONFIG.responseTimeoutMs,
      'Click one answer. This moves on after 3 seconds.'
    ),
    choices: CONFIG.confidenceOptions.map((opt) => opt.label),
    button_html: choiceButtonHtml(),
    trial_duration: CONFIG.responseTimeoutMs,
    response_ends_trial: true,
    on_finish: (data) => {
      const confLabel = confidenceResponseLabel(data.response);
      const timedOut = !confLabel;
      const opt = typeof data.response === 'number' ? CONFIG.confidenceOptions[data.response] : null;
      data.confidence_key = opt ? opt.key : '';
      data.confidence_label = confLabel;
      noteTaskResponse(!timedOut);
      DataSaver.logTrial({
        phase: 'recall',
        list_num: trial.listNum,
        trial_num: trial.trialNum,
        video_file: trial.videoPath,
        condition: trial.encodingCondition || '',
        is_old: trial.isOld ? 1 : 0,
        question: 'confidence',
        response: confLabel,
        rt_ms: timedOut ? '' : data.rt,
        timed_out: timedOut ? 1 : 0,
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

  const confidenceFeedback = {
    timeline: [
      choiceFeedbackTrial(() => {
        const last = lastRecallSubphase('confidence');
        return wrapHtml(
          buildRecallChoicePrompt(lastRecognitionLabel()) + confidencePromptHtml(last?.confidence_key || '')
        );
      }),
    ],
    conditional_function: () => {
      const last = lastRecallSubphase('confidence');
      return !!last?.confidence_label;
    },
  };

  let releaseSourceButtons = null;
  let notedSourceResponse = false;

  const source = {
    timeline: [
      {
        type: jsPsychHtmlButtonResponse,
        stimulus: wrapHtml(
          '<p style="font-size:28px;margin-top:24px;"><strong>When you saw this video, was there:</strong></p>'
        ),
        prompt: responseTimerPrompt(
          CONFIG.sourceResponseMs,
          'Click one answer. This stays up for 2 seconds.'
        ),
        choices: CONFIG.sourceOptions.map((opt) => opt.label),
        button_html: choiceButtonHtml(),
        trial_duration: CONFIG.sourceResponseMs,
        response_ends_trial: false,
        on_load: () => {
          notedSourceResponse = false;
          releaseSourceButtons = armChoiceButtons('jspsych-html-button-response-btngroup', {
            onPick: () => {
              if (notedSourceResponse) return;
              notedSourceResponse = true;
              noteTaskResponse(true);
            },
          });
        },
        on_finish: (data) => {
          if (releaseSourceButtons) {
            releaseSourceButtons();
            releaseSourceButtons = null;
          }
          const srcLabel = sourceResponseLabel(data.response);
          const timedOut = !srcLabel;
          const opt = typeof data.response === 'number' ? CONFIG.sourceOptions[data.response] : null;
          data.source_key = opt ? opt.key : '';
          if (!notedSourceResponse) {
            notedSourceResponse = true;
            noteTaskResponse(!timedOut);
          }
          const expected = expectedSourceLabel(trial.encodingCondition);
          const sourceCorrect = !timedOut && expected && srcLabel ? (srcLabel === expected ? 1 : 0) : '';

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
            rt_ms: timedOut ? '' : data.rt,
            timed_out: timedOut ? 1 : 0,
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
    conditional_function: () => lastRecognitionLabel() === 'old',
  };

  const sourceHold = {
    timeline: [
      {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: fixationHtml(),
        choices: 'NO_KEYS',
        trial_duration: CONFIG.sourceResponseMs,
        data: {
          phase: 'recall',
          subphase: 'source_hold',
          list_num: trial.listNum,
          trial_num: trial.trialNum,
        },
      },
    ],
    conditional_function: () => lastRecognitionLabel() !== 'old',
  };

  return {
    timeline: [
      fixation,
      videoAndResponse,
      recognitionFeedback,
      confidence,
      confidenceFeedback,
      source,
      sourceHold,
    ],
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
