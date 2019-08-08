if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const logger = require('pino')();
const db = require('./services/db');
const psn = require('./deals/psn');
psn.retreiveData();

var testfun = async () => {
  try {
    var results = await db.selectAllDeals();
    logger.info('pulled from db');
  } catch (e) {
    console.error('oops');
  }
};

var testInsert = async () => {
  try {
    var results = await db.insertList([
      {
        title: "Jimmy's Game",
        platform: 'gamestation',
        list: 12.99,
        msrp: 19.99,
        discount: 50,
        url: 'jimmyroland.com',
        thumbnail: 'thumb',
        thumbnail_key: 'thumburl',
        source: 'localhost'
      }
    ]);
    logger.info('entered into the database');
  } catch (e) {
    logger.error(e);
  }
};

//testInsert();
//testfun();
