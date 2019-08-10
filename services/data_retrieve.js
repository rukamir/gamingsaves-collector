const { psn, xbox, nintendo } = require('../deals');
xbox.retrieveData();
module.exports = {
  pull: () => {
    // setInterval(psn.retrieveData, 1800000);
    //  setInterval(xbox.retrieveData, 1800000);
    // setInterval(nintendo.retrieveData, 1800000);
  }
};
