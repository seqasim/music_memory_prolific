/**
 * consent.js — Research information screen before any task or data collection.
 * ==============================================================================
 * Agree continues into the session. Decline ends on a dead-end screen with no
 * completion redirect and no saved data.
 */

/**
 * First screen: agree or decline, with a print/save link.
 * @returns {object}
 */
function buildConsentTrial() {
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: wrapHtml(CONFIG.instructions.consent),
    choices: ['I AGREE / PROCEED TO STUDY', 'I DECLINE / EXIT STUDY'],
    button_html:
      '<button class="jspsych-btn" style="margin:12px 8px;min-width:280px;display:block;">%choice%</button>',
    on_load: () => {
      const link = document.getElementById('consent-print');
      if (!link) return;
      link.addEventListener('click', (event) => {
        event.preventDefault();
        window.print();
      });
    },
    on_finish: (data) => {
      window._consentAgreed = data.response === 0;
      window._consentRt = data.rt;
    },
  };
}

/**
 * Shown when the participant declines. No keys, no redirect.
 * @returns {object}
 */
function buildConsentDeclineTrial() {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: wrapHtml(CONFIG.instructions.consentDeclined),
    choices: 'NO_KEYS',
    trial_duration: null,
  };
}

if (typeof window !== 'undefined') {
  window.buildConsentTrial = buildConsentTrial;
  window.buildConsentDeclineTrial = buildConsentDeclineTrial;
}
