/**
 * datasaver.js — Clean data schema and dropout-safe saving
 * =========================================================
 * All experiment data passes through this module so output columns stay
 * consistent and partial sessions are recoverable.
 *
 * To add a new column, update DATA_COLUMNS and buildRow().
 */

const DATA_COLUMNS = [
  'row_type',
  'participant',
  'birth_year',
  'session_start_iso',
  'prolific_pid',
  'study_id',
  'session_id',
  'completed_session',
  'phase',
  'list_num',
  'trial_num',
  'condition',
  'video_file',
  'music_file',
  'question',
  'is_old',
  'correct',
  'response',
  'rt_ms',
  'trial_onset_ms',
  'browser',
  'screen_width',
  'screen_height',
  'focus_lost_count',
  'checkpoint_reason',
];

const DataSaver = {
  participant: '',
  birthYear: null,
  prolificPid: '',
  studyId: '',
  sessionId: '',
  sessionStartIso: '',
  sessionStartMs: 0,
  focusLostCount: 0,
  completedSession: false,
  assignmentLogged: false,
  rows: [],
  _flushedCount: 0,

  /**
   * Call once after participant info is collected.
   */
  init({ participant, birthYear, prolificPid = '', studyId = '', sessionId = '' }) {
    this.participant = participant;
    this.birthYear = birthYear;
    this.prolificPid = prolificPid || '';
    this.studyId = studyId || '';
    this.sessionId = sessionId || '';
    this.sessionStartIso = new Date().toISOString();
    this.sessionStartMs = performance.now();
    // Each session starts fresh; prior localStorage backups are kept for recovery only.
    this.rows = [];
    this._flushedCount = 0;
    this.completedSession = false;
    this.assignmentLogged = false;
    this._bindPageCloseHandler();
    this._trackFocusLoss();
  },

  /**
   * Write assignment metadata rows once at session start.
   * @param {object} assignment
   */
  logAssignment(assignment) {
    if (this.assignmentLogged) return;
    this.assignmentLogged = true;

    const base = this._baseFields('assignment');
    this._appendRow({
      ...base,
      row_type: 'assignment_meta',
      response: JSON.stringify(assignment.meta),
    });

    assignment.encodingTrials.forEach((trial) => {
      this._appendRow({
        ...base,
        row_type: 'assignment_encoding',
        list_num: trial.listNum,
        trial_num: trial.trialNum,
        condition: trial.condition,
        video_file: trial.videoPath,
        music_file: trial.musicPath || '',
      });
    });

    assignment.surveyTrials.forEach((trial, index) => {
      this._appendRow({
        ...base,
        row_type: 'assignment_survey',
        list_num: trial.listNum,
        trial_num: index + 1,
        condition: trial.condition,
        music_file: trial.musicPath,
        video_file: trial.sourceVideo,
      });
    });

    assignment.recallTrials.forEach((trial) => {
      this._appendRow({
        ...base,
        row_type: 'assignment_recall',
        list_num: trial.listNum,
        trial_num: trial.trialNum,
        video_file: trial.videoPath,
        is_old: trial.isOld ? 1 : 0,
      });
    });

    this.checkpoint('assignment');
  },

  /**
   * Build a clean row from trial data and save it.
   * @param {object} fields
   */
  logTrial(fields) {
    const row = {
      ...this._baseFields('trial'),
      row_type: 'trial',
      phase: fields.phase || '',
      list_num: fields.list_num ?? '',
      trial_num: fields.trial_num ?? '',
      condition: fields.condition || '',
      video_file: fields.video_file || '',
      music_file: fields.music_file || '',
      question: fields.question || '',
      is_old: fields.is_old ?? '',
      correct: fields.correct ?? '',
      response: fields.response ?? '',
      rt_ms: fields.rt_ms ?? '',
      trial_onset_ms: Math.round(performance.now() - this.sessionStartMs),
    };
    this._appendRow(row);
    this._persistLocalBackup();
  },

  /**
   * Save at list/phase boundaries (localStorage only).
   * @param {string} reason
   */
  checkpoint(reason) {
    this._persistLocalBackup();
  },

  /**
   * Mark session complete, stamp all rows, and persist backup.
   */
  finalize() {
    this.completedSession = true;
    this.rows.forEach((row) => {
      row.completed_session = 1;
    });
    this._persistLocalBackup();
  },

  /**
   * Download CSV for local testing.
   */
  downloadCsv() {
    const csv = this._rowsToCsv(this.rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${CONFIG.data.experimentName}_${this.participant}_${Date.now()}.csv`;
    link.click();
  },

  /**
   * Import saved rows into jsPsych data object before Pavlovia finish.
   * Idempotent: only writes rows that have not been flushed yet.
   * @param {object} jsPsych
   */
  flushToJsPsych(jsPsych) {
    for (let i = this._flushedCount; i < this.rows.length; i += 1) {
      jsPsych.data.write(this.rows[i]);
    }
    this._flushedCount = this.rows.length;
  },

  _baseFields() {
    return {
      participant: this.participant,
      birth_year: this.birthYear,
      session_start_iso: this.sessionStartIso,
      prolific_pid: this.prolificPid,
      study_id: this.studyId,
      session_id: this.sessionId,
      completed_session: this.completedSession ? 1 : 0,
      browser: navigator.userAgent,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      focus_lost_count: this.focusLostCount,
      checkpoint_reason: '',
      phase: '',
      list_num: '',
      trial_num: '',
      condition: '',
      video_file: '',
      music_file: '',
      question: '',
      is_old: '',
      correct: '',
      response: '',
      rt_ms: '',
      trial_onset_ms: '',
      row_type: '',
    };
  },

  _appendRow(row) {
    const normalized = {};
    DATA_COLUMNS.forEach((col) => {
      normalized[col] = row[col] ?? '';
    });
    this.rows.push(normalized);
  },

  _storageKey() {
    return `${CONFIG.data.localStoragePrefix}${this.participant}_${this.sessionStartIso}`;
  },

  _persistLocalBackup() {
    if (!CONFIG.data.localBackup) return;
    try {
      localStorage.setItem(
        this._storageKey(),
        JSON.stringify({
          participant: this.participant,
          sessionStartIso: this.sessionStartIso,
          completedSession: this.completedSession,
          rows: this.rows,
          savedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.warn('localStorage backup failed:', error);
    }
  },

  _loadLocalBackup() {
    if (!CONFIG.data.localBackup) return [];
    try {
      const keys = Object.keys(localStorage).filter((k) =>
        k.startsWith(CONFIG.data.localStoragePrefix)
      );
      if (!keys.length) return [];
      const latest = keys
        .map((key) => JSON.parse(localStorage.getItem(key)))
        .sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1))[0];
      return latest?.rows || [];
    } catch (error) {
      console.warn('Could not load local backup:', error);
      return [];
    }
  },

  _rowsToCsv(rows) {
    const escape = (value) => {
      const text = String(value ?? '');
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };
    const header = DATA_COLUMNS.join(',');
    const body = rows.map((row) => DATA_COLUMNS.map((col) => escape(row[col])).join(','));
    return [header, ...body].join('\n');
  },

  _bindPageCloseHandler() {
    const handler = () => {
      this.checkpoint('page_close');
      if (!window.location.hostname.includes('pavlovia')) return;
      if (window.jsPsych) {
        this.flushToJsPsych(window.jsPsych);
      }
    };
    window.addEventListener('pagehide', handler);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') handler();
    });
  },

  _trackFocusLoss() {
    window.addEventListener('blur', () => {
      this.focusLostCount += 1;
    });
  },
};

if (typeof window !== 'undefined') {
  window.DataSaver = DataSaver;
  window.DATA_COLUMNS = DATA_COLUMNS;
}
