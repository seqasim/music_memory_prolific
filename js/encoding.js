/**
 * encoding.js — Encoding phase timeline (watch videos with optional music)
 * =========================================================================
 * Structure: 9 lists × 12 trials. Each trial = fixation (3 s) + video to end.
 * Music (if any) starts at fixation onset and stops when the video ends.
 */

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
          listStartTrial(`Block ${listNum} of ${CONFIG.numLists}`),
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
    {
      timeline: listTimelines,
    },
  ];
}

/**
 * One encoding trial = fixation + video (audio spans both).
 * @param {object} trial
 * @returns {Array}
 */
function buildEncodingTrialPair(trial) {
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
    choices: 'NO_KEYS',
    controls: false,
    trial_ends_after_video: true,
    width: 800,
    height: 450,
    on_finish: (data) => {
      if (window._encodingAudio) {
        window._encodingAudio.pause();
        window._encodingAudio = null;
      }
      DataSaver.logTrial({
        phase: 'encoding',
        list_num: trial.listNum,
        trial_num: trial.trialNum,
        condition: trial.condition,
        video_file: trial.videoPath,
        music_file: trial.musicPath || '',
        response: 'watched',
        rt_ms: data.rt,
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
}
