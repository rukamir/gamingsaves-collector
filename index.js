if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const data_retrieve = require('./services/data_retrieve');

// start polling for data
data_retrieve.deleteExpiredDealsNow()
data_retrieve.deleteExpiredDealsAtInterval()
data_retrieve.pullMetaCriticDataNow();
data_retrieve.pullAllNow();
data_retrieve.pullMetaCriticDataAtInterval();
data_retrieve.pullAtInterval();
