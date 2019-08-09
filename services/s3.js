const stream = require('stream');
const logger = require('pino')();
const axios = require('axios');
const S3 = require('aws-sdk/clients/s3');
const { OBJ_STORAGE_ADDR, OBJ_STORAGE_PORT } = process.env;

const s3 = new S3({
  endpoint: `${OBJ_STORAGE_ADDR}:${OBJ_STORAGE_PORT}`,
  apiVersion: '2006-03-01',
  s3ForcePathStyle: true
});

module.exports = {
  CheckForBucketCreateIfNotExist: bucketName => {
    s3.listBuckets((err, data) => {
      if (err) logger.error(err.message, err.stack);
      else {
        const exists = data.Buckets.some(e => e.Name == bucketName);
        if (!exists)
          s3.createBucket({ Bucket: bucketName }, (err, data) => {
            if (err) logger.error(err.message, err.stack);
            else {
              logger.info(`Bucket ${bucketName} created buecasue it did not exist`);
            }
          });
      }
    });
  },
  CheckForExistingKey: (bucket, key, cb) => {
    return s3.headObject({ Bucket: bucket, Key: key }, cb);
  },
  uploadFromStream: (bucket, key) => {
    var pass = new stream.PassThrough();
    s3.upload(
      {
        ACL: 'public-read',
        Bucket: bucket,
        Key: key,
        Body: pass
      },
      (err, data) => {
        if (err) logger.error(err.message, err.stack);
        else {
          logger.info(`Upload successful ${data.key}`);
        }
      }
    );
    return pass;
  },
  uploadFromURL: async (url, bucket, key) => {
    try {
      const response = await axios.get(url, { responseType: 'stream' });
      response.data.pipe(this.uploadFromStream(bucket, key));
    } catch (error) {
      logger.error(error.message, error.stack);
    }
  }
};
