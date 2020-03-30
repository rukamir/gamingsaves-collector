const logger = require('pino')();
const axios = require('axios');
const db = require('../services/db');

const instance = axios.create({
  baseURL: 'https://chicken-coop.fr/',
  timeout: 5000
});

const convertPlatformToMCAPI = platform => {
  let platformNormalized = platform.toLowerCase();
  switch (platformNormalized) {
    case 'ps4':
      return 'playstation-4';
    case 'ps vita':
      return 'playstation-vita';
    case 'ps3':
      return 'playstation-3';
    case 'nintendo switch':
      return 'switch';
    case 'nintendo 3ds':
      return '3ds';
    case 'nintendo ds':
      return 'ds';
    case 'wii u':
      return 'wii-u';
    case 'xbox one':
      return 'xbox-one';
    case 'xbox 360':
      return 'xbox-360';
    default:
      return 'pc';
  }
};

const getAndSaveMetacritic = (title, platform) => {
  let platformMC = convertPlatformToMCAPI(platform);

  instance
    .get(`/rest/games/${title}`, { params: { platform: platformMC } })
    .then(resp => {
      let mcscore = 0;
      if (resp.data.result !== 'No result') {
        const { score } = resp.data.result;
        mcscore = score;
      }
      db.insertMetacritic(title, platform, mcscore)
        .then(() => logger.info('MetaCritic Score added', title, platformMC, mcscore))
        .catch(err => logger.info('MetaCoopApi DB call failed', err.message));
    })
    .catch(err => logger.warn('MetaCoopApi Failure', err.message));
};

module.exports = {
  lookForMissingMetaCriticScores: () => {
    logger.info('Looking for missing MetaCritic Scores');
    var requestList = [];
    db.getListOfMissingMetacritic(2)
      .then(rows => {
        if (rows[0].length) {
          rows[0].forEach(async row => getAndSaveMetacritic(row.title, row.platform));
        } else {
          logger.info('MetaCritic scores up-to-date');
        }
      })
      .catch(err => logger.warn('Could not check DB for missing MetaCritic', err.message));
  },
  handleMetaCriticScore: async (title, platform) => {
    try {
      const found = await db.isMetacriticSaved(title, platform);
      if (found) {
        logger.info('Found MC Score', title, platform);
        return;
      }
      getAndSaveMetacritic(title, platform);
    } catch (err) {
      logger.error('Error connecting to DB to verify MetaCritic entry', err.message);
    }
  }
};
