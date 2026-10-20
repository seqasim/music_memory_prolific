/**
 * encoding.js — Encoding phase timeline (watch videos with optional music)
 * =========================================================================
 * Structure: 9 lists × 12 trials. Each trial = fixation (3 s) + video to end.
 * Music (if any) starts at fixation onset and stops when the video ends.
 * During the video: F = one person or fewer, J = more than one person
 * (response does not end the trial).
 */

/** Cached person-count labels keyed by video path or basename. */
let _encodingVideoLabels = null;
let _encodingVideoLabelsPromise = null;

/**
 * Load stimuli/encoding_video_labels.json once.
 * @returns {Promise<object>}
 */
function loadEncodingVideoLabels() {
  if (_encodingVideoLabels) {
    return Promise.resolve(_encodingVideoLabels);
  }
  if (_encodingVideoLabelsPromise) {
    return _encodingVideoLabelsPromise;
  }
  const path = CONFIG.encodingOrienting.labelsPath;
  _encodingVideoLabelsPromise = fetch(path)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Could not load ${path} (${response.status})`);
      }
      return response.json();
    })
    .then((data) => {
      _encodingVideoLabels = data || {};
      return _encodingVideoLabels;
    })
    .catch((error) => {
      console.warn('Encoding video labels unavailable:', error);
      _encodingVideoLabels = {};
      return _encodingVideoLabels;
    });
  return _encodingVideoLabelsPromise;
}

/**
 * Resolve person-count label for a video path.
 * @param {string} videoPath
 * @returns {string} one_or_fewer | multiple | ambiguous | ''
 */
function encodingSceneLabel(videoPath) {
  const labels = _encodingVideoLabels || {};
  const fromPath = labels[videoPath];
  if (fromPath && typeof fromPath === 'string') return fromPath;
  const base = videoPath.split('/').pop();
  const fromBase = labels[base];
  if (fromBase && typeof fromBase === 'string') return fromBase;
  return '';
}

/**
 * Map orienting key to person-count label.
 * @param {string} response
 * @returns {'one_or_fewer'|'multiple'|''}
 */
function encodingOrientingLabel(response) {
  const key = String(response ?? '').toLowerCase();
  if (key === CONFIG.encodingOrienting.oneKey.toLowerCase()) return 'one_or_fewer';
  if (key === CONFIG.encodingOrienting.multipleKey.toLowerCase()) return 'multiple';
  return '';
}

/**
 * Score orienting response against label file.
 * Ambiguous / missing labels → correct left blank ('').
 * @param {string} responseLabel
 * @param {string} sceneLabel
 * @returns {0|1|''}
 */
function encodingOrientingCorrect(responseLabel, sceneLabel) {
  if (!responseLabel || !sceneLabel || sceneLabel === 'ambiguous') return '';
  return responseLabel === sceneLabel ? 1 : 0;
}

/**
 * Build the full encoding phase timeline.
 * @param {object} assignment - output of buildAssignment()
 * @returns {Array}
 */
function buildEncodingTimeline(assignment) {
  const trialsByList = {};
  assignment.encodingTrials.forEach((trial) => {
    if (!trialsByList[trial.listNum]) trialsByList[trial.listNum] = [];
    trialsByList[trial.listNum].push(trial);
  });

  const listTimelines = Object.keys(trialsByList)
    .sort((a, b) => Number(a) - Number(b))
    .map((listNum) => {
      const listTrials = trialsByList[listNum];
      const trialNodes = listTrials.flatMap((trial) => buildEncodingTrialPair(trial));

      return {
        timeline: [
          listStartTrial(
            `Block ${listNum} of ${CONFIG.numLists}` +
              '<br><br><strong>F</strong> = One person or fewer &nbsp;&nbsp; <strong>J</strong> = More than one person'
          ),
          ...trialNodes,
          {
            type: jsPsychCallFunction,
            func: () => DataSaver.checkpoint(`encoding_list_${listNum}`),
          },
        ],
      };
    });

  const welcomeHtml = CONFIG.isTestMode
    ? '<p style="background:#fff3cd;padding:12px;border-radius:6px;"><strong>TEST MODE</strong> — short experimenter run (3 trials).</p>' +
      CONFIG.instructions.welcome
    : CONFIG.instructions.welcome;

  return [
    instructionTrial(welcomeHtml),
    ...buildAudioCheckTimeline(),
    instructionTrial(CONFIG.instructions.encodingOrientingIntro),
    {
      type: jsPsychCallFunction,
      async: true,
      func: (done) => {
        loadEncodingVideoLabels().then(() => done());
      },
    },
    {
      timeline: listTimelines,
    },
  ];
}

/**
 * One encoding trial = fixation + video (audio spans both; orienting during video).
 * @param {object} trial
 * @returns {Array}
 */
function buildEncodingTrialPair(trial) {
  const oneKey = CONFIG.encodingOrienting.oneKey;
  const multipleKey = CONFIG.encodingOrienting.multipleKey;

  const fixation = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: fixationHtml(),
    choices: 'NO_KEYS',
    trial_duration: CONFIG.encodingFixationMs,
    on_start: () => {
      if (trial.musicPath) {
        window._encodingAudio = new Audio(trial.musicPath);
        window._encodingAudio.play().catch((err) => console.warn('Music play failed:', err));
      }
    },
    data: {
      phase: 'encoding',
      subphase: 'fixation',
      list_num: trial.listNum,
      trial_num: trial.trialNum,
      condition: trial.condition,
      video_file: trial.videoPath,
      music_file: trial.musicPath || '',
    },
  };

  const video = {
    type: jsPsychVideoKeyboardResponse,
    stimulus: [trial.videoPath],
    choices: [oneKey, multipleKey, oneKey.toUpperCase(), multipleKey.toUpperCase()],
    controls: false,
    trial_ends_after_video: true,
    response_ends_trial: false,
    width: 800,
    height: 450,
    prompt: wrapHtml(CONFIG.encodingOrienting.prompt),
    on_finish: (data) => {
      if (window._encodingAudio) {
        window._encodingAudio.pause();
        window._encodingAudio = null;
      }
      const responseLabel = encodingOrientingLabel(data.response);
      const sceneLabel = encodingSceneLabel(trial.videoPath);
      const correct = encodingOrientingCorrect(responseLabel, sceneLabel);

      DataSaver.logTrial({
        phase: 'encoding',
        list_num: trial.listNum,
        trial_num: trial.trialNum,
        condition: trial.condition,
        video_file: trial.videoPath,
        music_file: trial.musicPath || '',
        question: 'person_count',
        response: responseLabel || '',
        correct,
        rt_ms: data.rt ?? '',
        mem_score: trial.memScore ?? '',
        mem_alpha: trial.memAlpha ?? '',
      });
    },
    data: {
      phase: 'encoding',
      subphase: 'video',
      list_num: trial.listNum,
      trial_num: trial.trialNum,
      condition: trial.condition,
      video_file: trial.videoPath,
      music_file: trial.musicPath || '',
    },
  };

  return [fixation, video];
}

if (typeof window !== 'undefined') {
  window.buildEncodingTimeline = buildEncodingTimeline;
  window.loadEncodingVideoLabels = loadEncodingVideoLabels;
  window.encodingSceneLabel = encodingSceneLabel;
  window.encodingOrientingLabel = encodingOrientingLabel;
  window.encodingOrientingCorrect = encodingOrientingCorrect;
}
