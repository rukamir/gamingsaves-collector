const logger = require('pino')();
const axios = require('axios');
const db = require('../services/db');
// axios.interceptors.request.use(request => {
//   logger.info('Starting Request', request);
//   return request;
// });
const instance = axios.create({
  baseURL: 'https://store.playstation.com/valkyrie-api',
  timeout: 2000,
  headers: {
    Referer: 'https://store.playstation.com/en-us/grid/STORE-MSF77008-ALLDEALS/1',
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
  }
});
const SRC = 'playstation.com';

module.exports = {
  retreiveData: async () => {
    logger.info('Starting PSN data retrieval');
    const updated = new Date();
    var saleCount = 0;
    try {
      await db.deleteBySource(SRC);
      var firstResp = await instance.get(
        '/en/US/19/container/STORE-MSF77008-ALLDEALS?size=30&bucket=games&start=0'
      );

      saleCount = firstResp.data.data.attributes['total-results'];
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
              var thumbnailKey = 'a';
              const msrp = parseFloat(
                attributes.skus[0].prices['plus-user']['strikethrough-price'].display.split('$')[1]
              );
              const list = parseFloat(
                attributes.skus[0].prices['non-plus-user']['actual-price'].display.split('$')[1]
              );
              const memberPrice = parseFloat(
                attributes.skus[0].prices['plus-user']['actual-price'].display.split('$')[1]
              );
              return {
                id,
                title: attributes.name,
                platform: attributes.platforms[0],
                thumbnail_url: thumbnailURL,
                thumbnail_key: thumbnailKey,
                msrp,
                list,
                memberPrice,
                url: `https://store.playstation.com/en-us/product/${id}`,
                source: SRC,
                updated
              };
            });
            // insert into db
            try {
              var dbres = await db.insertList(gameList);
              // save to s3
            } catch (error) {
              logger.error(error.message);
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
