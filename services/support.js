const db = require('../services/db');
const s3 = require('../services/s3');
const lg = require('pino')();

module.exports = {
  getMetacriticData: (axios, title, platform) => {},
  deleteExpiredDeals: () => {
    lg.info(`Checking for expired deals...`)
    db.deleteExpired()
      .catch(err => lg.error(`Error deleting expired deals`, err.message))
  },
  handleThumbnail: (axios, bucket, key, SRC, thumbnailURL, logger) => {
    db.isThumbnailSaved(key, SRC)
      .then(found => {
        if (found) return;
        // insert to s3
        s3.CheckForExistingKey(bucket, key, (error, data) => {
          if (error) {
            logger.info(`${SRC} Creating new object ${key}`);
            axios
              .get(thumbnailURL, {
                responseType: 'stream'
              })
              .then(resp => resp.data.pipe(s3.uploadFromStream(bucket, key)))
              .catch(err => logger.error(`${SRC} Failed to upload ${key}`, err.message));
          } else {
            db.insertThumbnailMetadata(key, SRC)
              .then(() => logger.info(`${SRC} ID ${key} not in DB but found in S3. Added to DB.`))
              .catch(err => logger.warn(`${SRC} Error updating DB after already in S3. ${key}`));
          }
        });
      })
      .catch(err => logger.warn(`${SRC} error checking thumbnail existance? idc...`, err));
  }
};
