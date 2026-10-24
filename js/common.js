/**
 * common.js — Reusable timeline pieces (instructions, audio check, breaks)
 * =========================================================================
 * Shared screens used across encoding, survey, and recall.
 */

/** Simple centered HTML page styling used by instruction screens. */
function wrapHtml(inner) {
  return `<div style="max-width:800px;margin:40px auto;font-family:Arial,sans-serif;font-size:26px;line-height:1.5;">${inner}</div>`;
}

/** Fixation cross HTML — centered on viewport; size from CONFIG.fixationFontPx. */
function fixationHtml() {
  const px = CONFIG.fixationFontPx || 160;
  return (
    '<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
    `font-size:${px}px;line-height:1;color:black;font-weight:bold;">+</div>`
  );
}

/**
 * Welcome / instruction screen.
 * @param {string} html
 */
function instructionTrial(html) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: wrapHtml(html),
    choices: CONFIG.continueKeys,
  };
}

/**
 * Self-paced break between major phases.
 * @param {object} breakConfig - { title, text }
 */
function breakScreen(breakConfig) {
  return instructionTrial(`<h2>${breakConfig.title}</h2><p>${breakConfig.text}</p>`);
}

/**
 * Row (or column) of choices. The matching key gets the selection box.
 * @param {Array<{key: string, label: string}>} options
 * @param {string} selectedKey
 * @param {'row'|'column'} [layout]
 * @returns {string}
 */
function choiceRowHtml(options, selectedKey, layout) {
  const stack = layout === 'column';
  const wrapStyle = stack
    ? 'display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:16px;'
    : 'display:flex;justify-content:center;gap:16px;flex-wrap:wrap;margin-top:16px;';
  const items = (options || [])
    .map((opt) => {
      const selected = String(selectedKey ?? '') === String(opt.key) ? ' selected' : '';
      return `<span class="orient-choice${selected}"><strong>${opt.key}</strong> = ${opt.label}</span>`;
    })
    .join('');
  return `<div style="${wrapStyle}">${items}</div>`;
}

/**
 * Brief screen that shows a boxed choice and records nothing in DataSaver.
 * @param {function|string} stimulusFn
 * @returns {object}
 */
function choiceFeedbackTrial(stimulusFn) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: stimulusFn,
    choices: 'NO_KEYS',
    trial_duration: CONFIG.choiceFeedbackMs,
  };
}

/**
 * Audio check block: hear word, confirm, type answer.
 * Reused before encoding and survey (matches original task).
 */
function buildAudioCheckTimeline() {
  const audioPath = CONFIG.stimuli.audioCheck;
  let heardAudio = false;

  const intro = instructionTrial(CONFIG.instructions.audioCheckIntro);

  const playAudio = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: wrapHtml(
      '<p>Listen for the word.</p><p>Press <strong>Y</strong> if you heard it, or <strong>N</strong> to replay.</p>'
    ),
    choices: ['y', 'n', 'Y', 'N'],
    on_load: () => {
      const audio = new Audio(audioPath);
      window._audioCheckClip = audio;
      audio.play().catch((err) => console.warn('Audio play blocked:', err));
    },
    on_finish: (data) => {
      if (window._audioCheckClip) {
        window._audioCheckClip.pause();
        window._audioCheckClip = null;
      }
      const key = data.response?.toLowerCase();
      heardAudio = key === 'y';
      jsPsych.data.addDataToLastTrial({ phase: 'audio_check', response: key });
      DataSaver.logTrial({
        phase: 'audio_check',
        response: key,
        rt_ms: data.rt,
      });
    },
  };

  const replayLoop = {
    timeline: [playAudio],
    loop_function: () => !heardAudio,
  };

  const typeWord = {
    type: jsPsychSurveyHtmlForm,
    preamble: wrapHtml('<p>Type the word you heard:</p>'),
    html: '<p><input name="typed_word" type="text" required style="font-size:26px;padding:10px;" /></p>',
    button_label: 'Submit',
    on_finish: (data) => {
      const typed = (data.response?.typed_word || '').trim().toLowerCase();
      const correct = typed === CONFIG.audioCheckWord.toLowerCase();
      data.correct = correct;
      DataSaver.logTrial({
        phase: 'audio_check',
        question: 'typed_word',
        response: typed,
        correct: correct ? 1 : 0,
      });
      if (!correct) {
        alert('Incorrect word. Please check your audio and try again.');
      }
    },
  };

  const verify = {
    type: jsPsychCallFunction,
    func: () => {
      const last = jsPsych.data.get().last(1).values()[0];
      if (!last.correct) {
        jsPsych.endCurrentTimeline();
      }
    },
  };

  const retryWrapper = {
    timeline: [typeWord, verify],
    loop_function: () => {
      const last = jsPsych.data.get().filter({ phase: 'audio_check', question: 'typed_word' }).last(1).values()[0];
      return last && last.correct !== true;
    },
  };

  return [intro, replayLoop, retryWrapper];
}

/**
 * List-start screen shown before each encoding/recall block.
 */
function listStartTrial(label) {
  return instructionTrial(`<p>${label}</p><p>Press ENTER to begin.</p>`);
}

/**
 * End-of-session screen for experimenter test mode: summarizes logged rows.
 * @returns {Array}
 */
function buildTestVerificationTimeline() {
  return [
    {
      type: jsPsychCallFunction,
      func: () => {
        DataSaver.finalize();
        DataSaver.flushToJsPsych(jsPsych);
      },
    },
    {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: () => buildTestVerificationHtml(),
      choices: CONFIG.continueKeys,
      on_finish: () => {
        if (!/pavlovia\.org$/i.test(window.location.hostname)) {
          DataSaver.downloadCsv();
        }
      },
    },
  ];
}

/**
 * HTML summary of test-session data for experimenter verification.
 * @returns {string}
 */
function buildTestVerificationHtml() {
  const trialRows = DataSaver.rows.filter((r) => r.row_type === 'trial');
  const countByPhase = {};
  trialRows.forEach((row) => {
    countByPhase[row.phase] = (countByPhase[row.phase] || 0) + 1;
  });

  const encodingConditions = trialRows
    .filter((r) => r.phase === 'encoding')
    .map((r) => r.condition)
    .filter(Boolean);
  const surveyRatings = trialRows.filter(
    (r) => r.phase === 'survey' && r.question && r.question !== 'music_replay'
  ).length;
  const recallRecognition = trialRows.filter(
    (r) => r.phase === 'recall' && (!r.question || r.question === '')
  ).length;
  const recallConfidence = trialRows.filter(
    (r) => r.phase === 'recall' && r.question === 'confidence'
  ).length;
  const recallSource = trialRows.filter(
    (r) => r.phase === 'recall' && r.question === 'source'
  ).length;
  const encodingOrienting = trialRows.filter(
    (r) => r.phase === 'encoding' && r.question === 'person_count'
  ).length;

  const backupKey = `${CONFIG.data.localStoragePrefix}${DataSaver.participant}_${DataSaver.sessionStartIso}`;
  const hasBackup = !!localStorage.getItem(backupKey);

  const expectedEncoding = CONFIG.numLists * CONFIG.encodingTrialsPerList;
  const surveyClipsPerList =
    CONFIG.conditionsPerList.meam + CONFIG.conditionsPerList.control_music;
  const expectedSurveyRatings =
    CONFIG.numLists * surveyClipsPerList * CONFIG.surveyQuestions.length;
  const expectedRecall = CONFIG.numLists * CONFIG.recallTrialsPerList;

  const rows = [
    [
      'Encoding orienting rows',
      encodingOrienting,
      `${expectedEncoding} expected (F/J person count)`,
    ],
    [
      'Survey rating rows',
      surveyRatings,
      `${expectedSurveyRatings} expected (${CONFIG.surveyQuestions.length} per clip × ${CONFIG.numLists * surveyClipsPerList} clips)`,
    ],
    ['Recall OLD/NEW rows', recallRecognition, `${expectedRecall} expected`],
    ['Recall confidence rows', recallConfidence, `${expectedRecall} expected`],
    ['Recall source rows (OLD only)', recallSource, '≤ recognition count; only after OLD'],
    ['localStorage backup', hasBackup ? 'yes' : 'no', 'should be yes'],
    ['Experiment name', CONFIG.data.experimentName, 'should end in _TEST'],
  ];

  const tableRows = rows
    .map(
      ([label, value, note]) =>
        `<tr><td style="padding:6px 12px;border:1px solid #ccc;">${label}</td>` +
        `<td style="padding:6px 12px;border:1px solid #ccc;"><strong>${value}</strong></td>` +
        `<td style="padding:6px 12px;border:1px solid #ccc;color:#555;">${note}</td></tr>`
    )
    .join('');

  return wrapHtml(
    '<h2>Test session complete</h2>' +
      '<p><strong>Experimenter verification</strong> — check counts below, then press ENTER to download the CSV.</p>' +
      `<table style="border-collapse:collapse;margin:16px 0;font-size:22px;">${tableRows}</table>` +
      `<p>Encoding conditions seen: <strong>${encodingConditions.join(', ') || 'none'}</strong></p>` +
      '<p>Expected: no_music, meam, control_music (one trial each).</p>'
  );
}

if (typeof window !== 'undefined') {
  window.wrapHtml = wrapHtml;
  window.fixationHtml = fixationHtml;
  window.instructionTrial = instructionTrial;
  window.breakScreen = breakScreen;
  window.choiceRowHtml = choiceRowHtml;
  window.choiceFeedbackTrial = choiceFeedbackTrial;
  window.buildAudioCheckTimeline = buildAudioCheckTimeline;
  window.listStartTrial = listStartTrial;
  window.buildTestVerificationTimeline = buildTestVerificationTimeline;
}
