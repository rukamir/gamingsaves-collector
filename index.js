if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const logger = require('pino')();
const db = require('./services/db');
const data_retrieve = require('./services/data_retrieve');

// const coop = require('./services/metacoopapi');
// coop.getMetaCriticScore('Deus Ex: Mankind Divided', 'PS4');
// return;
// start polling for data
data_retrieve.pull();
