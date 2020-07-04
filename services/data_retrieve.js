const { psn, xbox, nintendo } = require('../deals');
const metacrit = require('../services/metacoopapi');
const { deleteExpiredDeals } = require('./support')

module.exports = {
  pullMetaCriticDataNow: async () => metacrit.lookForMissingMetaCriticScores(),
  pullMetaCriticDataAtInterval: () => setInterval(metacrit.lookForMissingMetaCriticScores, 30000),
  deleteExpiredDealsNow: async () => deleteExpiredDeals(),
  deleteExpiredDealsAtInterval: async () => setInterval(deleteExpiredDeals, 600000),
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
