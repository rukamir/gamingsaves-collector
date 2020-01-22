const { psn, xbox, nintendo } = require('../deals');
const pullAll = async () => {
  try {
    await nintendo.retrieveData();
    await psn.retrieveData();
    await xbox.retrieveData();
  } catch (error) {
    console.error(error.message, error.stack);
  }
};
pullAll();
module.exports = {
  pull: () => {
    setInterval(psn.retrieveData, 1800000);
    setInterval(xbox.retrieveData, 1800000);
    setInterval(nintendo.retrieveData, 1800000);
  }
};
