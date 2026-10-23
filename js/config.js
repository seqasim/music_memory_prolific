/**
 * config.js — ALL TUNABLE TASK SETTINGS LIVE HERE
 * =================================================
 * If you need to change timing, instructions, number of trials, or response
 * keys, edit this file first. Other files import these values.
 *
 * Units: durations are in milliseconds unless noted otherwise.
 */

const CONFIG = {
  // -------------------------------------------------------------------------
  // Participant / session
  // -------------------------------------------------------------------------

  /** Default birth year used when not provided in the URL (for music filtering). */
  defaultBirthYear: 1993,

  /**
   * Prolific study settings. Replace completionUrl's REPLACE_ME with the real
   * completion code from the Prolific study editor before going live.
   */
  prolific: {
    completionUrl: 'https://app.prolific.com/submissions/complete?cc=REPLACE_ME',
    pidParam: 'PROLIFIC_PID',
    studyParam: 'STUDY_ID',
    sessionParam: 'SESSION_ID',
  },

  /** If true, block phones/tablets (arrow keys required for recall). */
  requireDesktop: true,

  /**
   * Music files are named Cut_<YEAR>_*.mp3 (or .wav before conversion).
   * Only songs from birthYear + musicYearOffsetMin to birthYear + musicYearOffsetMax
   * are included. Matches the original PsychoPy logic.
   */
  musicYearOffsetMin: 15,
  musicYearOffsetMax: 30,
  musicYearCap: 2023,

  // -------------------------------------------------------------------------
  // Task structure
  // -------------------------------------------------------------------------

  /** Number of encoding lists (blocks). Original task: 9. */
  numLists: 9,

  /** Encoding trials per list. Original task: 12. */
  encodingTrialsPerList: 12,

  /** Recall trials per list (old + lure). Original task: 24. */
  recallTrialsPerList: 24,

  /**
   * Music conditions per encoding list. Must sum to encodingTrialsPerList.
   * Each list gets this many of each type, then they are shuffled.
   */
  conditionsPerList: {
    no_music: 4,
    meam: 4,
    control_music: 4,
  },

  // -------------------------------------------------------------------------
  // Timing (milliseconds)
  // -------------------------------------------------------------------------

  /** Fixation cross font size in pixels (centered on screen). */
  fixationFontPx: 160,

  /** Fixation cross before each encoding video. Original: 3000 ms. */
  encodingFixationMs: 3000,

  /** Fixation cross before each recall video. Original: 750 ms. */
  recallFixationMs: 750,

  /** Delay before recall video starts (after fixation). Original: 1000 ms. */
  recallVideoStartMs: 1000,

  /**
   * Maximum time to wait for a recall response after video ends.
   * null = wait indefinitely (original had open-ended keyboard).
   */
  recallResponseTimeoutMs: null,

  /** Brief highlight after each recall keypress (ms). */
  recallFeedbackMs: 500,

  // -------------------------------------------------------------------------
  // Response keys
  // -------------------------------------------------------------------------

  /** Keys that advance instruction / break screens. */
  continueKeys: ['Enter'],

  /** Recall: left arrow = OLD, right arrow = NEW (matches original). */
  recallKeys: {
    old: 'ArrowLeft',
    new: 'ArrowRight',
  },

  /**
   * Confidence after OLD/NEW: number keys → labels used in data.
   * Combined with old/new yields a 6-point scale for ROC / DPSD analysis.
   */
  confidenceKeys: {
    '1': 'sure',
    '2': 'maybe',
    '3': 'guess',
  },
  confidencePrompt:
    '<p style="font-size:28px;margin-top:24px;"><strong>How sure are you?</strong></p>' +
    '<p style="font-size:24px;margin-top:16px;">' +
    '<strong>1</strong> = Sure &nbsp;&nbsp; <strong>2</strong> = Maybe &nbsp;&nbsp; <strong>3</strong> = Guess</p>',

  /**
   * Source memory after OLD responses only.
   * Scored against encoding condition: no_music / meam→knew / control_music→did_not_know.
   */
  sourceKeys: {
    '1': 'no_music',
    '2': 'knew',
    '3': 'did_not_know',
  },
  sourcePrompt:
    '<p style="font-size:28px;margin-top:24px;"><strong>When you saw this video, was there:</strong></p>' +
    '<p style="font-size:24px;margin-top:16px;text-align:left;max-width:520px;margin-left:auto;margin-right:auto;">' +
    '<strong>1</strong> = No music<br>' +
    '<strong>2</strong> = Music you knew<br>' +
    '<strong>3</strong> = Music you did not know</p>',

  /**
   * Encoding orienting judgment (during video; does not end the trial).
   * Keys differ from recall arrows to avoid carry-over.
   * Count people only (animals / empty scenes → one or fewer).
   */
  encodingOrienting: {
    oneKey: 'f',
    multipleKey: 'j',
    labelsPath: 'stimuli/encoding_video_labels.json',
    prompt:
      '<p style="margin-top:12px;font-size:22px;">' +
      '<span id="orient-one" class="orient-choice" style="margin-right:48px;">' +
      '<strong>F</strong> = One person or fewer</span>' +
      '<span id="orient-multiple" class="orient-choice">' +
      '<strong>J</strong> = More than one person</span></p>',
  },

  /** Memento10k memorability / caption sidecar (analysis covariates; not shown). */
  mementoMetaPath: 'stimuli/memento_video_meta.json',

  /** Audio check: correct typed word (case-insensitive). */
  audioCheckWord: 'dog',

  // -------------------------------------------------------------------------
  // Survey (music ratings)
  // -------------------------------------------------------------------------

  /** Number keys for each survey item (1–5). */
  surveyResponseKeys: ['1', '2', '3', '4', '5'],

  /** Auto-advance each survey question after this long, answered or not. */
  surveyQuestionTimeoutMs: 3000,

  /**
   * How long to play each survey music clip (ms). Matches approximate encoding
   * exposure (fixation + video ≈ 6 s); full MP3 files are longer.
   */
  surveyMusicMs: 6000,

  /**
   * Questions shown after each music clip during the survey phase.
   * type: 'key_scale' — press 1–5; unanswered items time out.
   * labels: five tick labels (ends carry the anchors).
   */
  surveyQuestions: [
    {
      id: 'familiarity',
      type: 'key_scale',
      text: 'How familiar is this song?',
      labels: ['Not at all', '', '', '', 'Extremely'],
    },
    {
      id: 'autobio_memory',
      type: 'key_scale',
      text: 'Did this song bring back memories from your own life?',
      labels: ['None', '', '', '', 'Vivid, specific memory'],
    },
    {
      id: 'self_relevance',
      type: 'key_scale',
      text: 'How much did this song make you think about yourself?',
      labels: ['Not at all', '', '', '', 'Very much'],
    },
    {
      id: 'liking',
      type: 'key_scale',
      text: 'How much do you like this song?',
      labels: ['Not at all', '', '', '', 'Very much'],
    },
  ],

  // -------------------------------------------------------------------------
  // Stimulus paths (relative to online_version/ folder)
  // -------------------------------------------------------------------------

  stimuli: {
    encodingVideos: 'stimuli/encoding_videos',
    retrievalVideos: 'stimuli/retrieval_videos',
    meamMusic: 'stimuli/music_meam',
    controlMusic: 'stimuli/music_control',
    audioCheck: 'stimuli/audio_check.mp3',
  },

  // -------------------------------------------------------------------------
  // Preloading
  // -------------------------------------------------------------------------

  /** Audio/video load on demand during trials; startup preload caused false failures. */
  preloadAtStart: false,

  /** Recall videos stream on demand; do not bulk-preload 216 clips. */
  preloadRecallDuringBreak: false,

  // -------------------------------------------------------------------------
  // Break screens (between phases)
  // -------------------------------------------------------------------------

  breaks: {
    afterEncoding: {
      title: 'Encoding complete',
      text:
        'Great job! You have finished watching the videos.<br><br>' +
        'Next is the memory test. You will see videos and decide whether each one is ' +
        'OLD (seen before) or NEW (not seen before).<br><br>' +
        'Use the LEFT arrow for OLD and the RIGHT arrow for NEW.<br><br>' +
        'After each decision you will rate how sure you are (1 = Sure, 2 = Maybe, 3 = Guess). ' +
        'If you say OLD, you will also answer whether there was music with that video.<br><br>' +
        'Press ENTER when you are ready.',
    },
    afterRecall: {
      title: 'Memory test complete',
      text:
        'Last part: you will hear each music clip again for about 6 seconds and answer four short questions about each one.<br><br>' +
        'Press a number key from <strong>1</strong> to <strong>5</strong>. ' +
        'Each question moves on after <strong>3 seconds</strong>.<br><br>' +
        'Press ENTER when you are ready to continue.',
    },
  },

  // -------------------------------------------------------------------------
  // Instructions
  // -------------------------------------------------------------------------

  instructions: {
    welcome:
      '<h2>Welcome to the memory task</h2>' +
      '<p>This study takes about <strong>60 minutes</strong> in one sitting. ' +
      'Please use a <strong>desktop or laptop</strong> with a keyboard and working audio ' +
      '(headphones or speakers). Phones and tablets will not work.</p>' +
      '<p>The session has three parts:</p>' +
      '<ol style="text-align:left;max-width:720px;margin:16px auto;">' +
      '<li style="margin-bottom:12px;"><strong>Part 1 — Videos.</strong> ' +
      'You will watch short video clips. Some play with music in the background. ' +
      'Between clips, look at the fixation cross (+). ' +
      'While each video plays, press <strong>F</strong> if there is <strong>one person or fewer</strong> ' +
      'or <strong>J</strong> if there is <strong>more than one person</strong> (count people only). ' +
      'Try to remember the videos.</li>' +
      '<li style="margin-bottom:12px;"><strong>Part 2 — Memory test.</strong> ' +
      'You will see videos and decide whether each is <strong>OLD</strong> (seen in Part 1) ' +
      'or <strong>NEW</strong> (not seen before). ' +
      '<strong>LEFT arrow</strong> = OLD &nbsp;&nbsp; <strong>RIGHT arrow</strong> = NEW. ' +
      'Then rate how sure you are. If you say OLD, you will also answer a short question about music.</li>' +
      '<li style="margin-bottom:12px;"><strong>Part 3 — Music ratings.</strong> ' +
      'You will hear again each piece of music that played with a video. ' +
      'Each clip lasts about <strong>6 seconds</strong>. ' +
      'Then you will answer four short questions by pressing <strong>1</strong> to <strong>5</strong>. ' +
      'Each question moves on after <strong>3 seconds</strong>.</li>' +
      '</ol>' +
      '<p>Before Part 1 and again before Part 3, there is a short audio check. ' +
      'You will also see brief breaks between blocks. Press <strong>ENTER</strong> to advance instruction screens.</p>' +
      '<p>Press ENTER to continue.</p>',

    audioCheckIntro:
      '<h2>Audio check</h2>' +
      '<p>Make sure your volume is on. You will hear a word and need to type it.</p>' +
      '<p>If you do not hear it, you can replay the audio.</p>' +
      '<p>Press ENTER to continue.</p>',

    encodingOrientingIntro:
      '<h2>Video judgments</h2>' +
      '<p>While each video plays, decide how many <strong>people</strong> are in the clip.</p>' +
      '<p><strong>F</strong> = One person or fewer &nbsp;&nbsp; <strong>J</strong> = More than one person</p>' +
      '<p>Count people only (not animals). If there are no people, press <strong>F</strong>.</p>' +
      '<p>Press once as soon as you can. The video will keep playing until it ends.</p>' +
      '<p>Also try to remember each video for a later memory test.</p>' +
      '<p>Press ENTER to continue.</p>',

    encodingListStart:
      '<p>A new block is about to begin.</p>' +
      '<p><strong>F</strong> = One person or fewer &nbsp;&nbsp; <strong>J</strong> = More than one person</p>' +
      '<p>Press ENTER to start.</p>',

    surveyIntro:
      '<h2>Music survey</h2>' +
      '<p>You will hear music clips one at a time. Each clip plays for about <strong>6 seconds</strong>.</p>' +
      '<p>After each clip, answer four questions by pressing <strong>1</strong>, <strong>2</strong>, <strong>3</strong>, <strong>4</strong>, or <strong>5</strong>.</p>' +
      '<p>Each question moves on after <strong>3 seconds</strong>, whether or not you have answered.</p>' +
      '<p>Press ENTER to begin.</p>',

    consent:
      '<h2>Research information</h2>' +
      '<p><strong>Rutgers, The State University of New Jersey</strong><br>' +
      'Department of Neurosurgery, New Brunswick, NJ</p>' +
      '<p style="font-size:20px;"><strong>Mechanisms of Human Memory in Online General Populations</strong></p>' +
      '<div id="consent-text" style="text-align:left;max-height:42vh;overflow:auto;border:1px solid #ccc;padding:16px 18px;font-size:18px;line-height:1.45;">' +
      '<p>You are invited to take part in a research study at Rutgers University. Participation is completely voluntary.</p>' +
      '<p><strong>Purpose.</strong> To understand how people remember past experiences.</p>' +
      '<p><strong>What you will do.</strong> You will complete one online memory task (videos, a memory test, and short music ratings) on Pavlovia. The session takes about <strong>60 minutes</strong>.</p>' +
      '<p><strong>Payment.</strong> You will receive <strong>$12.00 per hour</strong> through Prolific when you finish.</p>' +
      '<p><strong>Risks.</strong> Risks are minimal: mild eye strain, boredom, or tiredness from a computer task. There are rest breaks between blocks.</p>' +
      '<p><strong>Benefits.</strong> There is no direct benefit to you. The study may help researchers understand memory.</p>' +
      '<p><strong>Privacy.</strong> We do not collect your name, IP address, medical information, or contact details. Research records use only the temporary Prolific ID from the study link.</p>' +
      '<p><strong>Leaving the study.</strong> You may skip any survey question or stop at any time by closing this window.</p>' +
      '<p><strong>Questions.</strong> For questions about your rights as a participant, contact the Rutgers Human Research Protection Program, 335 George Street, Liberty Plaza Suite 3200, New Brunswick, NJ 08901. Phone: (848) 932-0150. Email: irb-office@research.rutgers.edu.</p>' +
      '<p>By clicking <strong>I AGREE</strong>, you confirm that:</p>' +
      '<ol>' +
      '<li>You have read and understood this information.</li>' +
      '<li>You are at least 18 years old and fluent in English.</li>' +
      '<li>You voluntarily agree to participate.</li>' +
      '<li>You may print or save a copy of this form.</li>' +
      '</ol></div>' +
      '<p style="font-size:18px;margin-top:12px;"><a href="#" id="consent-print">Print or save a copy</a></p>',

    consentDeclined:
      '<h2>You declined to participate</h2>' +
      '<p>You chose not to participate. Please close this window and return your submission on Prolific.</p>',

    end:
      '<h2>Thank you!</h2>' +
      '<p>You have completed the task.</p>' +
      '<p>Press ENTER to finish.</p>',

    endWithRedirect:
      '<h2>Thank you!</h2>' +
      '<p>You have completed the task. Your data are being saved.</p>' +
      '<p>If you are not redirected automatically, click the link below to return to Prolific.</p>',

    mobileBlocked:
      '<h2>Desktop required</h2>' +
      '<p>This study must be completed on a computer with a keyboard (arrow keys are required).</p>' +
      '<p>Please reopen the study link on a desktop or laptop, then return to Prolific if needed.</p>',

    setupError:
      '<h2>Unable to start</h2>' +
      '<p>Something went wrong while setting up the session.</p>' +
      '<p>Please contact the researcher and return this submission on Prolific if you were redirected here.</p>',
  },

  // -------------------------------------------------------------------------
  // Data saving
  // -------------------------------------------------------------------------

  data: {
    /** Experiment name shown in output files. */
    experimentName: 'music_memory_online',

    /** Save to browser localStorage after every trial (dropout protection). */
    localBackup: true,

    /** localStorage key prefix for backup rows. */
    localStoragePrefix: 'music_memory_data_',
  },

  // -------------------------------------------------------------------------
  // Debug / testing
  // -------------------------------------------------------------------------

  /**
   * URL param ?phase=encoding|survey|recall runs only that phase.
   * Useful for testing one section without running the full ~1hr session.
   */
  debugPhaseParam: 'phase',

  // -------------------------------------------------------------------------
  // Experimenter test mode (short session; not for participants)
  // -------------------------------------------------------------------------

  /** Set true when test mode is active (see applyTestModeIfActive). */
  isTestMode: false,

  /**
   * Passphrase required for ?test=<passphrase> on index.html.
   * test.html sets window.TEST_MODE directly (experimenter entry point).
   */
  testPassphrase: 'rutgers2026',

  /** Overrides applied when test mode is active. */
  TEST_OVERRIDES: {
    numLists: 1,
    encodingTrialsPerList: 3,
    recallTrialsPerList: 6,
    conditionsPerList: {
      no_music: 1,
      meam: 1,
      control_music: 1,
    },
  },
};

/**
 * Activate test mode when window.TEST_MODE is set (test.html) or URL has correct passphrase.
 * Wrong/missing passphrase on index.html leaves the full task unchanged.
 */
function applyTestModeIfActive() {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const testKey = params.get('test');
  const active = window.TEST_MODE === true || (testKey && testKey === CONFIG.testPassphrase);

  if (!active) {
    CONFIG.isTestMode = false;
    return;
  }

  window.TEST_MODE = true;
  CONFIG.isTestMode = true;
  Object.assign(CONFIG, CONFIG.TEST_OVERRIDES);
  CONFIG.data.experimentName = 'music_memory_online_TEST';
}

// Export for module scripts; also attach to window for plain script tags.
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
  applyTestModeIfActive();
}
