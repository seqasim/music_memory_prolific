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

  /** Audio check: correct typed word (case-insensitive). */
  audioCheckWord: 'dog',

  // -------------------------------------------------------------------------
  // Survey (music ratings)
  // -------------------------------------------------------------------------

  /** Slider scale minimum and maximum (1–5 in original). */
  surveyScaleMin: 1,
  surveyScaleMax: 5,
  surveyScaleStep: 1,
  surveyDefaultValue: 3,

  /** Fixed slider width so rating bars do not resize with question text. */
  surveySliderWidthPx: 500,

  /** Questions shown after each music clip during the survey phase. */
  surveyQuestions: [
    { id: 'familiarity', text: 'How familiar are you with this music?' },
    { id: 'liking', text: 'How much do you like this music?' },
    { id: 'memory_strength', text: 'How strong were the memories evoked by this music?' },
    {
      id: 'self_relevance',
      text: 'While listening to this song, how much were you thinking about yourself or your own life?',
    },
    { id: 'emotionally_moving', text: 'How emotionally moving did you find this song?' },
    {
      id: 'reliving',
      text: 'How vividly did you mentally relive past experiences while hearing this song?',
    },
    { id: 'distraction', text: 'During the video, how distracting did you find the music?' },
    { id: 'engagement', text: 'How stimulating or engaging did you find this song?' },
    { id: 'novelty', text: 'How novel or unexpected did you find this song?' },
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
        'Next you will hear music clips and answer a few short questions about each one.<br><br>' +
        'Press ENTER when you are ready to continue.',
    },
    beforeRecall: {
      title: 'Short break',
      text:
        'You are about to begin the memory test.<br><br>' +
        'You will see videos and decide whether each one is OLD (seen before) or NEW (not seen before).<br><br>' +
        'Use the LEFT arrow for OLD and the RIGHT arrow for NEW.<br><br>' +
        'Press ENTER when you are ready.',
    },
  },

  // -------------------------------------------------------------------------
  // Instructions
  // -------------------------------------------------------------------------

  instructions: {
    welcome:
      '<h2>Welcome to the memory task</h2>' +
      '<p>You will watch a series of short video clips. Try to remember them.</p>' +
      '<p>Later you will be tested on whether you have seen each video before.</p>' +
      '<p>Between videos, please look at the fixation cross (+).</p>' +
      '<p>Press ENTER to continue.</p>',

    audioCheckIntro:
      '<h2>Audio check</h2>' +
      '<p>Make sure your volume is on. You will hear a word and need to type it.</p>' +
      '<p>If you do not hear it, you can replay the audio.</p>' +
      '<p>Press ENTER to continue.</p>',

    encodingListStart:
      '<p>A new block is about to begin.</p>' +
      '<p>Press ENTER to start.</p>',

    surveyIntro:
      '<h2>Music survey</h2>' +
      '<p>You will hear music clips one at a time.</p>' +
      '<p>For each clip, move the slider and press ENTER to submit your rating.</p>' +
      '<p>Press ENTER to begin.</p>',

    recallIntro:
      '<p>Now you will see videos and decide if each is <strong>OLD</strong> (seen during encoding) ' +
      'or <strong>NEW</strong> (not seen before).</p>' +
      '<p><strong>LEFT arrow</strong> = OLD &nbsp;&nbsp; <strong>RIGHT arrow</strong> = NEW</p>' +
      '<p>Press ENTER to proceed.</p>',

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
