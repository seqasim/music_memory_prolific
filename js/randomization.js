/**
 * randomization.js — Build the full trial assignment for one participant
 * ========================================================================
 * Called once at session start. The returned object is shared by encoding,
 * survey, and recall so stimulus pairing stays consistent.
 *
 * To change how videos are shuffled or paired with music, edit this file.
 */

/**
 * Fisher-Yates shuffle (in-place copy).
 * @param {Array} array
 * @param {function} rng - optional () => [0,1) random function
 * @returns {Array}
 */
function shuffleArray(array, rng = Math.random) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Split array into chunks of fixed size.
 * @param {Array} array
 * @param {number} chunkSize
 * @returns {Array<Array>}
 */
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Build condition labels for one encoding list (e.g. 4 no_music, 4 meam, 4 control).
 * @returns {string[]}
 */
function buildConditionList() {
  const labels = [];
  Object.entries(CONFIG.conditionsPerList).forEach(([condition, count]) => {
    for (let i = 0; i < count; i += 1) {
      labels.push(condition);
    }
  });
  return labels;
}

/**
 * Extract basename without extension from a file path.
 * @param {string} path
 * @returns {string}
 */
function basenameNoExt(path) {
  const name = path.split('/').pop();
  return name.replace(/\.[^.]+$/, '');
}

/**
 * Create the full session assignment.
 *
 * @param {object} manifest - STIMULI_MANIFEST object
 * @param {object} options
 * @param {number} options.birthYear
 * @param {function} [options.rng] - seeded or Math.random
 * @returns {object} assignment
 */
function buildAssignment(manifest, options = {}) {
  const rng = options.rng || Math.random;
  const numLists = CONFIG.numLists;
  const perList = CONFIG.encodingTrialsPerList;
  const recallPerList = CONFIG.recallTrialsPerList;

  const encodingPool = shuffleArray(manifest.encodingVideos, rng);
  const expectedEncoding = numLists * perList;
  if (encodingPool.length < expectedEncoding) {
    throw new Error(
      `Need at least ${expectedEncoding} encoding videos, found ${encodingPool.length}.`
    );
  }

  const encodingLists = chunkArray(encodingPool.slice(0, expectedEncoding), perList);

  const encodingBasenames = new Set(encodingPool.slice(0, expectedEncoding).map(basenameNoExt));
  const lurePool = shuffleArray(
    manifest.retrievalVideos.filter((path) => !encodingBasenames.has(basenameNoExt(path))),
    rng
  );
  const expectedLures = numLists * (recallPerList / 2);
  if (lurePool.length < expectedLures) {
    throw new Error(
      `Need at least ${expectedLures} lure videos, found ${lurePool.length}.`
    );
  }
  const lureLists = chunkArray(lurePool.slice(0, expectedLures), recallPerList / 2);

  const meamPool = shuffleArray(
    manifest.meamMusic.length ? manifest.meamMusic : _placeholderMusicPool('meam'),
    rng
  );
  const controlPool = shuffleArray(
    manifest.controlMusic.length ? manifest.controlMusic : _placeholderMusicPool('control'),
    rng
  );
  let meamIdx = 0;
  let controlIdx = 0;

  const encodingTrials = [];
  const surveyTrials = [];

  encodingLists.forEach((videos, listIndex) => {
    const conditions = shuffleArray(buildConditionList(), rng);

    videos.forEach((videoPath, trialIndex) => {
      const condition = conditions[trialIndex];
      let musicPath = null;

      if (condition === 'meam') {
        if (meamIdx >= meamPool.length) {
          throw new Error('Not enough MEAM music files for this design.');
        }
        musicPath = meamPool[meamIdx];
        meamIdx += 1;
        surveyTrials.push({
          listNum: listIndex + 1,
          trialNum: trialIndex + 1,
          condition,
          musicPath,
          sourceVideo: videoPath,
        });
      } else if (condition === 'control_music') {
        if (controlIdx >= controlPool.length) {
          throw new Error('Not enough control music files for this design.');
        }
        musicPath = controlPool[controlIdx];
        controlIdx += 1;
        surveyTrials.push({
          listNum: listIndex + 1,
          trialNum: trialIndex + 1,
          condition,
          musicPath,
          sourceVideo: videoPath,
        });
      }

      encodingTrials.push({
        listNum: listIndex + 1,
        trialNum: trialIndex + 1,
        condition,
        videoPath,
        musicPath,
      });
    });
  });

  const recallTrials = [];
  encodingLists.forEach((oldVideos, listIndex) => {
    const lures = lureLists[listIndex];
    const combined = shuffleArray([...oldVideos, ...lures], rng).map((videoPath) => ({
      listNum: listIndex + 1,
      videoPath,
      isOld: encodingBasenames.has(basenameNoExt(videoPath)),
    }));
    combined.forEach((trial, trialIndex) => {
      recallTrials.push({
        listNum: trial.listNum,
        trialNum: trialIndex + 1,
        videoPath: trial.videoPath,
        isOld: trial.isOld,
      });
    });
  });

  return {
    encodingTrials,
    surveyTrials,
    recallTrials,
    meta: {
      numLists,
      encodingTrialsPerList: perList,
      recallTrialsPerList: recallPerList,
      totalEncoding: encodingTrials.length,
      totalSurvey: surveyTrials.length,
      totalRecall: recallTrials.length,
    },
  };
}

if (typeof window !== 'undefined') {
  window.shuffleArray = shuffleArray;
  window.chunkArray = chunkArray;
  window.buildAssignment = buildAssignment;
}

/**
 * Fallback when music folders are empty (e.g. MasterVersion without music).
 * Repeats the audio-check file so the task structure can still be tested.
 * @param {string} label
 * @returns {string[]}
 */
function _placeholderMusicPool(label) {
  const needed = CONFIG.numLists * CONFIG.conditionsPerList[label === 'meam' ? 'meam' : 'control_music'];
  console.warn(
    `No ${label} music files in manifest — using audio check placeholder for ${needed} trials. ` +
      'Add real music to stimuli/music_meam and stimuli/music_control before running participants.'
  );
  return Array.from({ length: needed }, () => CONFIG.stimuli.audioCheck);
}
