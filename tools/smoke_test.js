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
  if (context.CONFIG.defaultBirthYear !== context.STIMULI_MANIFEST.birthYearUsed) {
    throw new Error(
      `CONFIG.defaultBirthYear (${context.CONFIG.defaultBirthYear}) does not match ` +
        `manifest birthYearUsed (${context.STIMULI_MANIFEST.birthYearUsed})`
    );
  }
  if (
    context.STIMULI_MANIFEST.counts.meamMusic !== 36 ||
    context.STIMULI_MANIFEST.counts.controlMusic !== 36
  ) {
    throw new Error(
      `Expected 36 MEAM and 36 control clips, got ${context.STIMULI_MANIFEST.counts.meamMusic} ` +
        `and ${context.STIMULI_MANIFEST.counts.controlMusic}`
    );
  }
  console.log('smoke_test OK (prolific config + requireDesktop + cohort manifest)');

  const assignment = context.buildAssignment(context.STIMULI_MANIFEST);
  const m = assignment.meta;

  if (m.totalEncoding !== 108) throw new Error(`Expected 108 encoding trials, got ${m.totalEncoding}`);
  if (m.totalSurvey !== 72) throw new Error(`Expected 72 survey clips, got ${m.totalSurvey}`);
  if (m.totalRecall !== 216) throw new Error(`Expected 216 recall trials, got ${m.totalRecall}`);

  const audioCheck = context.CONFIG.stimuli.audioCheck;
  if (assignment.encodingTrials.some((trial) => trial.musicPath === audioCheck)) {
    throw new Error('Full session used audio-check placeholder music; add real cohort clips');
  }
  const meamTrials = assignment.encodingTrials.filter((trial) => trial.condition === 'meam');
  const controlTrials = assignment.encodingTrials.filter((trial) => trial.condition === 'control_music');
  if (meamTrials.length !== 36 || controlTrials.length !== 36) {
    throw new Error(
      `Expected 36 MEAM and 36 control encoding trials, got ${meamTrials.length} and ${controlTrials.length}`
    );
  }

  console.log('smoke_test OK (full session)');
  console.log('  encoding:', m.totalEncoding);
  console.log('  survey:', m.totalSurvey);
  console.log('  recall:', m.totalRecall);
  console.log('  birth year:', context.STIMULI_MANIFEST.birthYearUsed);

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
  if (testContext.recallResponseLabel(0) !== 'old' || testContext.recallResponseLabel(1) !== 'new') {
    throw new Error('recallResponseLabel should map click indexes 0 and 1');
  }
  if (testContext.recallResponseLabel('ArrowRight') !== 'new') {
    throw new Error('recallResponseLabel should map ArrowRight to new');
  }
  if (testContext.confidenceResponseLabel(0) !== 'sure' || testContext.confidenceResponseLabel(2) !== 'guess') {
    throw new Error('confidenceResponseLabel should map click indexes to sure and guess');
  }
  if (testContext.confidenceResponseLabel('1') !== 'sure') {
    throw new Error('confidenceResponseLabel should map 1 to sure');
  }
  if (testContext.sourceResponseLabel(0) !== 'no_music' || testContext.sourceResponseLabel(1) !== 'knew') {
    throw new Error('sourceResponseLabel should map click indexes to no_music and knew');
  }
  if (testContext.sourceResponseLabel('2') !== 'knew') {
    throw new Error('sourceResponseLabel should map 2 to knew');
  }
  if (testContext.expectedSourceLabel('meam') !== 'knew') {
    throw new Error('expectedSourceLabel(meam) should be knew');
  }
  if (testContext.expectedSourceLabel('control_music') !== 'did_not_know') {
    throw new Error('expectedSourceLabel(control_music) should be did_not_know');
  }
  if (testContext.expectedSourceLabel('no_music') !== 'no_music') {
    throw new Error('expectedSourceLabel(no_music) should be no_music');
  }

  const oldWithCondition = testAssignment.recallTrials.filter((t) => t.isOld);
  if (!oldWithCondition.every((t) => t.encodingCondition)) {
    throw new Error('Old recall trials should carry encodingCondition');
  }
  if (testAssignment.recallTrials.some((t) => !t.isOld && t.encodingCondition)) {
    throw new Error('Lure recall trials should not carry encodingCondition');
  }

  if (testContext.CONFIG.surveyQuestions.length !== 4) {
    throw new Error(`Expected 4 survey questions, got ${testContext.CONFIG.surveyQuestions.length}`);
  }
  if (testContext.CONFIG.responseTimeoutMs !== 3000) {
    throw new Error('responseTimeoutMs should be 3000');
  }
  if (testContext.CONFIG.surveyQuestionTimeoutMs !== 3000) {
    throw new Error('surveyQuestionTimeoutMs should follow the 3 second response limit');
  }
  if (testContext.CONFIG.sourceResponseMs !== 2000) {
    throw new Error('sourceResponseMs should be 2000');
  }
  if (testContext.CONFIG.surveyMusicMs !== 3000) {
    throw new Error('surveyMusicMs should be 3000');
  }
  if (testContext.CONFIG.instructionMaxMs !== 120000) {
    throw new Error('instructionMaxMs should be 2 minutes');
  }
  if (!String(testContext.CONFIG.instructions.consent).includes('$12.00')) {
    throw new Error('consent should state the $12 payment');
  }
  if (String(testContext.CONFIG.instructions.consent).includes('per hour')) {
    throw new Error('consent should not promise hourly pay');
  }
  if (
    !testContext.CONFIG.encodingOrienting.choices ||
    testContext.CONFIG.encodingOrienting.choices.join('|') !== 'One person or fewer|More than one person'
  ) {
    throw new Error('person-count choices should be the two click labels');
  }
  if (!Array.isArray(testContext.CONFIG.surveyScaleValues) || testContext.CONFIG.surveyScaleValues.join() !== '1,2,3,4,5') {
    throw new Error('surveyScaleValues should be 1–5');
  }
  if (testContext.CONFIG.choiceFeedbackMs !== 400) {
    throw new Error('choiceFeedbackMs should be 400');
  }
  const confidenceOptionKeys = (testContext.CONFIG.confidenceOptions || []).map((opt) => opt.key);
  if (confidenceOptionKeys.join() !== Object.keys(testContext.CONFIG.confidenceKeys).join()) {
    throw new Error('confidenceOptions keys should match confidenceKeys');
  }
  const sourceOptionKeys = (testContext.CONFIG.sourceOptions || []).map((opt) => opt.key);
  if (sourceOptionKeys.join() !== Object.keys(testContext.CONFIG.sourceKeys).join()) {
    throw new Error('sourceOptions keys should match sourceKeys');
  }
  const surveyTypes = Object.fromEntries(
    testContext.CONFIG.surveyQuestions.map((q) => [q.id, q.type || 'key_scale'])
  );
  for (const id of ['familiarity', 'autobio_memory', 'self_relevance', 'liking']) {
    if (surveyTypes[id] !== 'key_scale') {
      throw new Error(`${id} should be key_scale`);
    }
  }
  for (const dropped of [
    'memory_strength',
    'engagement',
    'emotionally_moving',
    'specific_memory',
    'reliving',
    'age_first_heard',
    'recent_exposure',
    'earworm',
    'valence',
    'arousal',
    'distraction',
    'novelty',
  ]) {
    if (surveyTypes[dropped]) {
      throw new Error(`Survey should not include dropped item ${dropped}`);
    }
  }
  if (String(testContext.CONFIG.instructions.welcome).includes('LEFT arrow')) {
    throw new Error('welcome should describe clicks rather than arrow keys');
  }
  if (!testContext.CONFIG.instructions.consent || !testContext.CONFIG.instructions.consentDeclined) {
    throw new Error('consent instructions should be set');
  }
  if (!String(testContext.CONFIG.instructions.welcome).includes('class="bot-warning"')) {
    throw new Error('welcome instructions should include the red bot-screening warning');
  }
  if (
    !String(testContext.CONFIG.instructions.welcome).includes(
      'filtered out as an AI bot'
    )
  ) {
    throw new Error('welcome instructions should warn that non-response or random answers may filter bots');
  }
  if (testContext.CONFIG.attention?.consecutiveMissLimit !== 3) {
    throw new Error('attention.consecutiveMissLimit should be 3');
  }
  if (testContext.CONFIG.attention?.bannerText !== 'missed responses may disqualify you as a bot') {
    throw new Error('attention.bannerText should match the on-screen warning');
  }
  loadScript('js/common.js', testContext);
  testContext._consecutiveMisses = 0;
  if (testContext.noteTaskResponse(false) !== false || testContext._consecutiveMisses !== 1) {
    throw new Error('one miss should not show the banner');
  }
  if (testContext.noteTaskResponse(false) !== false || testContext._consecutiveMisses !== 2) {
    throw new Error('two misses should not show the banner');
  }
  if (testContext.noteTaskResponse(false) !== true || testContext._consecutiveMisses !== 3) {
    throw new Error('three misses in a row should show the banner');
  }
  if (testContext.noteTaskResponse(true) !== false || testContext._consecutiveMisses !== 0) {
    throw new Error('a real response should clear the miss streak and hide the banner');
  }
  if (!testContext.CONFIG.breaks.afterRecall) {
    throw new Error('breaks.afterRecall should lead into the survey');
  }
  if (!testContext.CONFIG.encodingOrienting || testContext.CONFIG.encodingOrienting.oneKey !== 'f') {
    throw new Error('CONFIG.encodingOrienting.oneKey should be f');
  }
  if (testContext.CONFIG.encodingOrienting.multipleKey !== 'j') {
    throw new Error('CONFIG.encodingOrienting.multipleKey should be j');
  }
  console.log('smoke_test OK (recall confidence/source + survey + orienting config)');

  loadScript('js/encoding.js', testContext);
  if (testContext.encodingOrientingLabel('F') !== 'one_or_fewer') {
    throw new Error('encodingOrientingLabel(F) should be one_or_fewer');
  }
  if (testContext.encodingOrientingLabel('j') !== 'multiple') {
    throw new Error('encodingOrientingLabel(j) should be multiple');
  }
  if (testContext.encodingOrientingLabel(0) !== 'one_or_fewer' || testContext.encodingOrientingLabel(1) !== 'multiple') {
    throw new Error('encodingOrientingLabel should map click indexes 0 and 1');
  }
  if (testContext.encodingOrientingCorrect('one_or_fewer', 'one_or_fewer') !== 1) {
    throw new Error('orienting correct should be 1 for matching labels');
  }
  if (testContext.encodingOrientingCorrect('one_or_fewer', 'ambiguous') !== '') {
    throw new Error('orienting correct should be blank for ambiguous scenes');
  }
  console.log('smoke_test OK (encoding orienting helpers)');

  const labelsPath = path.join(root, 'stimuli/encoding_video_labels.json');
  if (!fs.existsSync(labelsPath)) {
    throw new Error('Missing stimuli/encoding_video_labels.json');
  }
  const labelsJson = JSON.parse(fs.readFileSync(labelsPath, 'utf8'));
  const encodingBasenames = context.STIMULI_MANIFEST.encodingVideos.map((p) => p.split('/').pop());
  for (const base of encodingBasenames) {
    if (!labelsJson[base]) {
      throw new Error(`encoding_video_labels.json missing ${base}`);
    }
    if (!['one_or_fewer', 'multiple', 'ambiguous'].includes(labelsJson[base])) {
      throw new Error(`Invalid label for ${base}: ${labelsJson[base]}`);
    }
  }
  console.log('smoke_test OK (encoding video labels cover all encoding videos)');

  const mementoPath = path.join(root, 'stimuli/memento_video_meta.json');
  if (!fs.existsSync(mementoPath)) {
    throw new Error('Missing stimuli/memento_video_meta.json');
  }
  const mementoJson = JSON.parse(fs.readFileSync(mementoPath, 'utf8'));
  for (const base of encodingBasenames) {
    if (!mementoJson[base] || mementoJson[base].mem_score == null) {
      throw new Error(`memento_video_meta.json missing mem_score for ${base}`);
    }
  }
  const assignmentWithMeta = context.buildAssignment(context.STIMULI_MANIFEST, {
    mementoMeta: mementoJson,
  });
  if (!assignmentWithMeta.encodingTrials.every((t) => t.memScore !== '' && t.memScore != null)) {
    throw new Error('buildAssignment should stamp memScore on encoding trials');
  }
  console.log('smoke_test OK (memento metadata stamped on assignment)');

  // DataSaver: prolific columns + finalize stamps completed_session
  const dataContext = makeContext();
  loadScript('js/config.js', dataContext);
  loadScript('js/datasaver.js', dataContext);

  const cols = dataContext.DATA_COLUMNS;
  for (const col of ['prolific_pid', 'study_id', 'session_id', 'mem_score', 'mem_alpha', 'timed_out']) {
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
  dataContext.DataSaver.logTrial({
    phase: 'survey',
    question: 'familiarity',
    response: '',
    timed_out: 1,
  });
  if (dataContext.DataSaver.rows[1].timed_out !== 1) {
    throw new Error('timed_out should be stored on survey timeout rows');
  }
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
