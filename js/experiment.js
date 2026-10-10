/**
 * experiment.js — Assemble and run the full session timeline
 * ============================================================
 * Entry point called from index.html after jsPsych plugins load.
 */

/** True when running on a Pavlovia host (pilot or production). */
function isOnPavlovia() {
  return /pavlovia\.org$/i.test(window.location.hostname);
}

/**
 * Heuristic desktop check: reject obvious phones/tablets (arrow keys required).
 * @returns {boolean}
 */
function isDesktopBrowser() {
  const ua = navigator.userAgent || '';
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return false;
  }
  if (navigator.maxTouchPoints > 1 && Math.min(window.screen.width, window.screen.height) < 768) {
    return false;
  }
  return true;
}

/**
 * Parse URL query parameters (?participant=P01&birthYear=1990&phase=encoding)
 * @returns {object}
 */
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const prolific = CONFIG.prolific || {};
  return {
    participant: params.get('participant'),
    birthYear: params.get('birthYear') ? Number(params.get('birthYear')) : null,
    phase: params.get(CONFIG.debugPhaseParam),
    prolificPid: params.get(prolific.pidParam || 'PROLIFIC_PID'),
    studyId: params.get(prolific.studyParam || 'STUDY_ID'),
    sessionId: params.get(prolific.sessionParam || 'SESSION_ID'),
  };
}

/**
 * Build preload list for startup.
 * Only preload the small audio-check clip here. Music and videos
 * load on demand per trial — preloading all of them caused "The experiment failed to load."
 * @param {object} assignment
 * @returns {{images: string[], audio: string[], videos: string[]}}
 */
function buildPreloadAssets(assignment) {
  return {
    images: [],
    audio: [CONFIG.stimuli.audioCheck],
    videos: [],
  };
}

/**
 * Verify key stimulus files are reachable before building the timeline.
 * @param {object} manifest
 * @returns {Promise<string|null>} error message or null if OK
 */
async function validateStimuliReachable(manifest) {
  const samples = [
    CONFIG.stimuli.audioCheck,
    manifest.encodingVideos[0],
    manifest.meamMusic[0] || null,
  ].filter(Boolean);

  for (const path of samples) {
    try {
      const response = await fetch(path, { method: 'HEAD' });
      if (!response.ok) {
        return (
          `Missing stimulus file (${response.status}): ${path}\n\n` +
          'Run: python3 tools/generate_manifest.py --birth-year 1993'
        );
      }
    } catch (error) {
      return (
        `Could not load: ${path}\n\n` +
        'Use http://localhost:8080 (not file://) and regenerate the stimulus manifest.'
      );
    }
  }
  return null;
}

/**
 * Append a dead-end instruction screen after a setup failure.
 * @param {string} detail
 */
function showFatalScreen(detail) {
  const body =
    (CONFIG.instructions.setupError || '<h2>Unable to start</h2>') +
    (detail ? `<pre style="white-space:pre-wrap;font-size:18px;background:#f4f4f4;padding:12px;">${detail}</pre>` : '');
  jsPsych.addNodeToEndOfTimeline({
    timeline: [
      {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: wrapHtml(body),
        choices: 'NO_KEYS',
        trial_duration: null,
      },
    ],
  });
}

/**
 * Finalize data, optionally download CSV locally, then Pavlovia finish + completion screen.
 * @param {object} opts
 * @param {string} opts.participant
 * @param {string} opts.prolificPid
 * @param {boolean} opts.onPavlovia
 * @returns {Array}
 */
function buildSessionEndTimeline({ participant, prolificPid, onPavlovia }) {
  const timeline = [];

  timeline.push({
    type: jsPsychCallFunction,
    func: () => {
      DataSaver.finalize();
      DataSaver.flushToJsPsych(jsPsych);
      if (!onPavlovia) {
        DataSaver.downloadCsv();
      }
    },
  });

  if (window.jsPsychPavlovia && onPavlovia) {
    timeline.push({
      type: jsPsychPavlovia,
      command: 'finish',
      participantId: participant || prolificPid || 'PARTICIPANT',
      errorCallback: (error) => {
        window._pavloviaUploadError = error;
        console.error('Pavlovia upload error:', error);
      },
    });
  }

  timeline.push(buildCompletionTrial({ prolificPid }));
  return timeline;
}

/**
 * Final screen: redirect to Prolific when configured, always show a fallback link.
 * @param {{ prolificPid: string|null }} opts
 */
function buildCompletionTrial({ prolificPid }) {
  const completionUrl = (CONFIG.prolific && CONFIG.prolific.completionUrl) || '';
  const canRedirect =
    !!prolificPid &&
    !!completionUrl &&
    !completionUrl.includes('REPLACE_ME');

  return {
    type: jsPsychHtmlKeyboardResponse,
    choices: 'NO_KEYS',
    trial_duration: null,
    stimulus: () => {
      const uploadError = window._pavloviaUploadError;
      let html = CONFIG.instructions.endWithRedirect || CONFIG.instructions.end;
      if (uploadError) {
        html +=
          '<p style="color:#a00;"><strong>Data upload may have failed.</strong> ' +
          'Please contact the researcher and keep this window open if possible.</p>';
      }
      if (completionUrl) {
        const label = canRedirect
          ? 'Click here if you are not redirected'
          : 'Completion link (replace REPLACE_ME in CONFIG.prolific.completionUrl before going live)';
        html +=
          `<p style="margin-top:24px;"><a href="${completionUrl}" id="prolific-completion-link" ` +
          `style="font-size:22px;">${label}</a></p>`;
      }
      if (!prolificPid) {
        html += '<p style="color:#555;font-size:18px;">No Prolific ID was supplied; you can close this window.</p>';
      }
      return wrapHtml(html);
    },
    on_load: () => {
      if (canRedirect) {
        window.setTimeout(() => {
          window.location.replace(completionUrl);
        }, 400);
      }
    },
  };
}

/**
 * Main runner.
 */
async function runExperiment() {
  const url = getUrlParams();
  const onPavlovia = isOnPavlovia();

  if (CONFIG.requireDesktop && !isDesktopBrowser()) {
    jsPsych.run([
      {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: wrapHtml(CONFIG.instructions.mobileBlocked),
        choices: 'NO_KEYS',
        trial_duration: null,
      },
    ]);
    return;
  }

  // Precedence: ?participant > PROLIFIC_PID > typed in the form.
  let participant = url.participant || url.prolificPid || null;
  let birthYear = url.birthYear || CONFIG.defaultBirthYear;
  const prolificPid = url.prolificPid || '';
  const studyId = url.studyId || '';
  const sessionId = url.sessionId || '';
  const hasPidFromUrl = !!(url.participant || url.prolificPid);

  const timeline = [];

  const birthYearOnlyForm = {
    type: jsPsychSurveyHtmlForm,
    preamble: wrapHtml('<h2>Participant information</h2>'),
    html: `
      <p>Birth year:<br><input name="birthYear" type="number" min="1930" max="2010" required style="font-size:18px;padding:6px;" value="${birthYear || ''}"></p>
    `,
    button_label: 'Start experiment',
    on_finish: (data) => {
      birthYear = Number(data.response.birthYear);
      if (!participant) {
        participant = prolificPid;
      }
    },
  };

  const fullEntryForm = {
    type: jsPsychSurveyHtmlForm,
    preamble: wrapHtml('<h2>Participant information</h2>'),
    html: `
      <p>Participant ID:<br><input name="participant" type="text" required style="font-size:18px;padding:6px;" value="${participant || ''}"></p>
      <p>Birth year:<br><input name="birthYear" type="number" min="1930" max="2010" required style="font-size:18px;padding:6px;" value="${birthYear || ''}"></p>
    `,
    button_label: 'Start experiment',
    on_finish: (data) => {
      participant = data.response.participant.trim();
      birthYear = Number(data.response.birthYear);
    },
  };

  if (url.participant && url.birthYear) {
    // Fully specified via URL — require a keypress so the browser allows audio later.
    timeline.push(instructionTrial('<p>Press ENTER to begin the session.</p>'));
  } else if (url.prolificPid && !url.participant) {
    // Prolific: PID known; only ask for birth year (unless also in URL).
    if (url.birthYear) {
      timeline.push(instructionTrial('<p>Press ENTER to begin the session.</p>'));
    } else {
      timeline.push(birthYearOnlyForm);
    }
  } else if (!hasPidFromUrl) {
    timeline.push(fullEntryForm);
  } else {
    timeline.push(instructionTrial('<p>Press ENTER to begin the session.</p>'));
  }

  const setupNode = {
    type: jsPsychCallFunction,
    async: true,
    func: async (done) => {
      if (!participant) {
        participant = url.participant || url.prolificPid;
        birthYear = url.birthYear || birthYear || CONFIG.defaultBirthYear;
      }
      if (!participant) {
        showFatalScreen('Participant ID is required.');
        done();
        return;
      }

      DataSaver.init({
        participant,
        birthYear,
        prolificPid,
        studyId,
        sessionId,
      });

      const manifest = STIMULI_MANIFEST;
      const reachabilityError = await validateStimuliReachable(manifest);
      if (reachabilityError) {
        showFatalScreen(reachabilityError);
        done();
        return;
      }

      if (birthYear !== STIMULI_MANIFEST.birthYearUsed) {
        console.warn(
          `Birth year ${birthYear} differs from manifest (${STIMULI_MANIFEST.birthYearUsed}). ` +
            'Re-run: python3 tools/generate_manifest.py --birth-year ' +
            birthYear
        );
      }

      let assignment;
      try {
        assignment = buildAssignment(manifest);
      } catch (error) {
        showFatalScreen(`Could not build experiment: ${error.message}`);
        done();
        return;
      }

      DataSaver.logAssignment(assignment);
      window._assignment = assignment;

      const phase = url.phase;
      const includeEncoding = !phase || phase === 'encoding';
      const includeSurvey = !phase || phase === 'survey';
      const includeRecall = !phase || phase === 'recall';

      const phaseTimeline = [];
      if (CONFIG.preloadAtStart) {
        const assets = buildPreloadAssets(assignment);
        phaseTimeline.push({
          type: jsPsychPreload,
          auto_preload: false,
          message: 'Loading audio check...',
          audio: assets.audio,
          show_progress_bar: true,
          show_detailed_errors: true,
        });
      }

      if (includeEncoding) phaseTimeline.push(...buildEncodingTimeline(assignment));
      if (includeSurvey) phaseTimeline.push(...buildSurveyTimeline(assignment));
      if (includeRecall) {
        const recallVideos = assignment.recallTrials.map((t) => t.videoPath);
        phaseTimeline.push(...buildRecallTimeline(assignment, recallVideos));
      }

      if (CONFIG.isTestMode) {
        phaseTimeline.push(...buildTestVerificationTimeline());
        // Test mode already finalizes inside buildTestVerificationTimeline; skip duplicate finalize.
        // Still need Pavlovia finish + completion screen after verification.
        if (window.jsPsychPavlovia && onPavlovia) {
          phaseTimeline.push({
            type: jsPsychPavlovia,
            command: 'finish',
            participantId: participant || prolificPid || 'PARTICIPANT',
            errorCallback: (error) => {
              window._pavloviaUploadError = error;
              console.error('Pavlovia upload error:', error);
            },
          });
        }
        phaseTimeline.push(buildCompletionTrial({ prolificPid }));
      } else {
        phaseTimeline.push(instructionTrial(CONFIG.instructions.end));
        phaseTimeline.push(
          ...buildSessionEndTimeline({ participant, prolificPid, onPavlovia })
        );
      }

      jsPsych.addNodeToEndOfTimeline({ timeline: phaseTimeline });
      done();
    },
  };

  timeline.push(setupNode);

  if (window.jsPsychPavlovia && onPavlovia) {
    timeline.unshift({ type: jsPsychPavlovia, command: 'init' });
  }

  jsPsych.run(timeline);
}

if (typeof window !== 'undefined') {
  window.runExperiment = runExperiment;
  window.getUrlParams = getUrlParams;
  window.isDesktopBrowser = isDesktopBrowser;
  window.isOnPavlovia = isOnPavlovia;
}
