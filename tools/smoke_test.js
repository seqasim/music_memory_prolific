#!/usr/bin/env node
/**
 * smoke_test.js — Quick validation without opening a browser
 * Run: node tools/smoke_test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function loadScript(relativePath, context) {
  const code = fs.readFileSync(path.join(root, relativePath), 'utf8');
  vm.runInContext(code, context, { filename: relativePath });
}

function makeContext(windowExtras = {}) {
  const sandbox = {
    console,
    Math,
    performance: { now: () => 0 },
    navigator: { userAgent: 'smoke-test' },
    localStorage: {
      _data: {},
      setItem(k, v) {
        this._data[k] = v;
      },
      getItem(k) {
        return this._data[k] || null;
      },
      key(i) {
        return Object.keys(this._data)[i] || null;
      },
      get length() {
        return Object.keys(this._data).length;
      },
    },
    document: { addEventListener: () => {} },
    screen: { width: 1440, height: 900 },
    addEventListener: () => {},
    location: { hostname: 'localhost', search: '' },
    URLSearchParams,
    ...windowExtras,
  };
  // Scripts assign to window.*; alias so those land on the sandbox itself.
  sandbox.window = sandbox;
  return vm.createContext(sandbox);
}

const context = makeContext();

try {
  loadScript('js/config.js', context);
  loadScript('js/stimuli_manifest.js', context);
  loadScript('js/randomization.js', context);

  if (!context.CONFIG.prolific) {
    throw new Error('CONFIG.prolific is missing');
  }
  const prolificKeys = ['completionUrl', 'pidParam', 'studyParam', 'sessionParam'];
  for (const key of prolificKeys) {
    if (!context.CONFIG.prolific[key]) {
      throw new Error(`CONFIG.prolific.${key} is missing`);
    }
  }
  if (context.CONFIG.prolific.pidParam !== 'PROLIFIC_PID') {
    throw new Error('CONFIG.prolific.pidParam should be PROLIFIC_PID');
  }
  if (context.CONFIG.requireDesktop !== true) {
    throw new Error('CONFIG.requireDesktop should be true');
  }
  console.log('smoke_test OK (prolific config + requireDesktop)');

  const assignment = context.buildAssignment(context.STIMULI_MANIFEST);
  const m = assignment.meta;

  if (m.totalEncoding !== 108) throw new Error(`Expected 108 encoding trials, got ${m.totalEncoding}`);
  if (m.totalSurvey !== 72) throw new Error(`Expected 72 survey clips, got ${m.totalSurvey}`);
  if (m.totalRecall !== 216) throw new Error(`Expected 216 recall trials, got ${m.totalRecall}`);

  console.log('smoke_test OK (full session)');
  console.log('  encoding:', m.totalEncoding);
  console.log('  survey:', m.totalSurvey);
  console.log('  recall:', m.totalRecall);

  // Test mode assignment (same overrides as CONFIG.TEST_OVERRIDES)
  const testContext = makeContext({ TEST_MODE: true });
  loadScript('js/config.js', testContext);
  loadScript('js/stimuli_manifest.js', testContext);
  loadScript('js/randomization.js', testContext);

  if (!testContext.CONFIG.isTestMode) {
    throw new Error('Test mode should be active when window.TEST_MODE is true');
  }
  if (testContext.CONFIG.data.experimentName !== 'music_memory_online_TEST') {
    throw new Error('Test mode should suffix experiment name with _TEST');
  }

  const testAssignment = testContext.buildAssignment(testContext.STIMULI_MANIFEST);
  const tm = testAssignment.meta;
  const encodingConditions = [
    ...new Set(testAssignment.encodingTrials.map((t) => t.condition)),
  ].sort();

  if (tm.totalEncoding !== 3) throw new Error(`Test mode: expected 3 encoding, got ${tm.totalEncoding}`);
  if (tm.totalSurvey !== 2) throw new Error(`Test mode: expected 2 survey clips, got ${tm.totalSurvey}`);
  if (tm.totalRecall !== 6) throw new Error(`Test mode: expected 6 recall, got ${tm.totalRecall}`);
  if (encodingConditions.join(',') !== 'control_music,meam,no_music') {
    throw new Error(`Test mode: expected one trial per condition, got ${encodingConditions.join(', ')}`);
  }

  console.log('smoke_test OK (test mode)');
  console.log('  encoding:', tm.totalEncoding, encodingConditions);
  console.log('  survey:', tm.totalSurvey);
  console.log('  recall:', tm.totalRecall);

  loadScript('js/recall.js', testContext);
  if (testContext.recallResponseLabel('arrowleft') !== 'old') {
    throw new Error('recallResponseLabel should map arrowleft to old');
  }
  if (testContext.recallResponseLabel('ArrowRight') !== 'new') {
    throw new Error('recallResponseLabel should map ArrowRight to new');
  }
  if (testContext.CONFIG.surveyQuestions.length !== 9) {
    throw new Error('Expected 9 survey questions');
  }
  console.log('smoke_test OK (recall key mapping + survey questions)');

  // DataSaver: prolific columns + finalize stamps completed_session
  const dataContext = makeContext();
  loadScript('js/config.js', dataContext);
  loadScript('js/datasaver.js', dataContext);

  const cols = dataContext.DATA_COLUMNS;
  for (const col of ['prolific_pid', 'study_id', 'session_id']) {
    if (!cols.includes(col)) {
      throw new Error(`DATA_COLUMNS missing ${col}`);
    }
  }

  dataContext.DataSaver.init({
    participant: 'test',
    birthYear: 1993,
    prolificPid: 'test',
    studyId: 'study1',
    sessionId: 'sess1',
  });
  dataContext.DataSaver.logTrial({
    phase: 'encoding',
    list_num: 1,
    trial_num: 1,
    condition: 'no_music',
    response: '',
  });
  if (dataContext.DataSaver.rows[0].completed_session !== 0) {
    throw new Error('New rows should start with completed_session = 0');
  }
  if (dataContext.DataSaver.rows[0].prolific_pid !== 'test') {
    throw new Error('prolific_pid should be stamped on rows');
  }
  dataContext.DataSaver.finalize();
  if (!dataContext.DataSaver.rows.every((r) => r.completed_session === 1)) {
    throw new Error('finalize() should stamp completed_session = 1 on all rows');
  }
  if (typeof dataContext.DataSaver._syncToPavlovia === 'function') {
    throw new Error('_syncToPavlovia should be removed');
  }
  console.log('smoke_test OK (datasaver prolific columns + finalize)');
} catch (error) {
  console.error('smoke_test FAILED:', error.message);
  process.exit(1);
}
