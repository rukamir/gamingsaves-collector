const { psn, xbox, nintendo } = require('../deals');
const metacrit = require('../services/metacoopapi');

module.exports = {
  pullMetaCriticDataNow: async () => metacrit.lookForMissingMetaCriticScores(),
  pullMetaCriticDataAtInterval: () => setInterval(metacrit.lookForMissingMetaCriticScores, 30000),
  pullAllNow: async () => {
    try {
      await nintendo.retrieveData();
      await psn.retrieveData();
      await xbox.retrieveData();
    } catch (error) {
      console.error(error.message, error.stack);
    }
  },
  pullAtInterval: () => {
    setInterval(psn.retrieveData, 1200000);
    setInterval(xbox.retrieveData, 3300000);
    setInterval(nintendo.retrieveData, 1800000);
  }
};
