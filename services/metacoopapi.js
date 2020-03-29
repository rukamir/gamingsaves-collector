const logger = require('pino')();
const axios = require('axios');

const instance = axios.create({
  baseURL: 'https://chicken-coop.fr/',
  timeout: 3500
});
module.exports = {
  getMetaCriticScore: (title, platform) => {
    instance
      .get(`/rest/games/${title}`, { params: { platform } })
      .then(resp => {
        logger.info('My data', resp.data);
      })
      .catch(err => logger.info('MetaCoopApi Failure', err.message));
  }
};
