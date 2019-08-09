if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const logger = require('pino')();
const db = require('./services/db');

const psn = require('./deals/psn');
psn.retrieveData();
