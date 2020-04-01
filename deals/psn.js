const logger = require('pino')();
const axios = require('axios');
const db = require('../services/db');
const s3 = require('../services/s3');
const { handleThumbnail } = require('../services/support');

// axios.interceptors.request.use(request => {
//   logger.info('Starting Request', request);
//   return request;
// });
const instance = axios.create({
  baseURL: 'https://store.playstation.com/valkyrie-api',
  timeout: 8000,
  headers: {
    Referer: 'https://store.playstation.com/en-us/grid/STORE-MSF77008-ALLDEALS/1',
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
  }
});
const BUCKET_NAME = 'psn';
const SRC = 'psn';
s3.CheckForBucketCreateIfNotExist(BUCKET_NAME);

const getRating = psnRatingUrl => {
  const rating = psnRatingUrl
    .split('/')
    .pop()
    .split('.')[0];
  return rating.toUpperCase();
};

module.exports = {
  retrieveData: async () => {
    logger.info('Starting PSN data retrieval');
    const updated = new Date();
    var saleCount = 0;
    try {
      var firstResp = await instance.get(
        '/en/US/19/container/STORE-MSF77008-ALLDEALS?size=30&bucket=games&start=0'
      );

      saleCount = firstResp.data.data.attributes['total-results'];

      var sourceCounts = await db.countBySource(SRC);
      let filteredCount = sourceCounts.find(srcCnt => srcCnt.source === SRC);
      if (!!filteredCount && filteredCount.count == saleCount) {
        logger.info(`${SRC} number of deals did not change. Skipping update.`);
        return;
      }

      await db.deleteBySource(SRC);

      var currentIndex = 0;
      const groupSize = 30;
      var requestList = [];
      // const pullDate = new Date();
      // while (currentIndex < saleCount) {
      while (currentIndex < saleCount) {
        requestList.push(
          instance.get(
            `/en/US/19/container/STORE-MSF77008-ALLDEALS?size=${groupSize}&bucket=games&start=${currentIndex}`
          )
        );
        currentIndex += groupSize;
      }

      Promise.all(requestList)
        .then(req => {
          req.forEach(async res => {
            const gamesContentTypeOne = res.data.included.filter(
              elem => !!elem.attributes['content-type'] && elem.attributes['content-type'] == '1'
            );
            var gameList = gamesContentTypeOne.map(e => {
              const { id, attributes } = e;
              const thumbnailURL = attributes['thumbnail-url-base'];
              const genres = attributes.genres;
              const release = attributes['release-date'];
              const description = attributes['long-description'];
              const publisher = attributes['provider-name'];
              const rating = getRating(attributes['content-rating'].url);
              const msrp = parseFloat(
                attributes.skus[0].prices['plus-user']['strikethrough-price'].display.split('$')[1]
              );
              const list = parseFloat(
                attributes.skus[0].prices['non-plus-user']['actual-price'].display.split('$')[1]
              );
              const memberPrice = parseFloat(
                attributes.skus[0].prices['plus-user']['actual-price'].display.split('$')[1]
              );

              handleThumbnail(axios, BUCKET_NAME, id, SRC, thumbnailURL, logger);

              return {
                id,
                title: attributes.name.replace(/[^\x00-\xFF]/g, ''),
                platform: attributes.platforms[0],
                thumbnail_url: thumbnailURL,
                thumbnail_key: `${id}`,
                msrp,
                list,
                memberPrice,
                url: `https://store.playstation.com/en-us/product/${id}`,
                source: SRC,
                description: description.replace(/[^\x00-\xFF]/g, ''),
                rating,
                release: new Date(release),
                updated,
                genres,
                publisher
              };
            });
            // insert into db
            try {
              logger.info(`${SRC} Inserting ${gameList.length}`);
              await db.insertList(gameList);
            } catch (error) {
              logger.error(`${SRC} 1` + error);
            }
          });
        })
        .catch(err => {
          logger.error(err);
          logger.error(`PSN catch 1 %s `, err.message);
        });
    } catch (e) {
      logger.error(`PSN catch 2 %s `, e.message);
    }
  }
};
