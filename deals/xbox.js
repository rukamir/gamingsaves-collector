const logger = require('pino')();
const axios = require('axios');
const db = require('../services/db');
const s3 = require('../services/s3');
const _get = require('lodash/get');

const SRC = 'xbox.com';
const BUCKET_NAME = 'xbox';
s3.CheckForBucketCreateIfNotExist(BUCKET_NAME);

module.exports = {
  retrieveData: async () => {
    logger.info('Starting Xbox retrieval');
    const updated = new Date();
    try {
      await db.deleteBySource(SRC);
      const resp = await axios.get(
        'https://www.xbox.com/en-US/games/xbox-one/js/xcat-bi-urls.json',
        {
          timeout: 4500
        }
      );

      var rawGameList = resp.data
        .split(';')
        .filter(e => e.includes('fullGameArray'))[0]
        .split('= ')[1];
      var gameList = JSON.parse(rawGameList);
      var qStrList = [];
      while (gameList.length > 20) {
        qStrList.push(gameList.splice(0, 20));
      }
      if (qStrList.length) qStrList.push(gameList);

      const requestList = qStrList
        .map(e => {
          return `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${e.join(
            ','
          )}&market=US&languages=en-us&MS-CV=DGU1mcuYo0WMMp+F.1`;
        })
        .map(urlQuery => {
          return axios.get(urlQuery, {
            timeout: 20000,
            headers: {
              Origin: 'https://www.xbox.com',
              Referer: 'https://www.xbox.com/en-US/games/xbox-one?cat=onsale',
              'User-Agent':
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
            }
          });
        });

      Promise.all(requestList)
        .then(respList => {
          respList.forEach(async resp => {
            logger.info(resp.duration);
            const gameData = resp.data.Products.reduce((filtered, game) => {
              const { ListPrice, MSRP } = _get(
                game,
                'DisplaySkuAvailabilities[0].Availabilities[0].OrderManagementData.Price',
                { MSRP: 0, ListPrice: 0 }
              );

              if (ListPrice < MSRP) {
                const { ProductId } = game;
                const {
                  ListPrice,
                  MSRP
                } = game.DisplaySkuAvailabilities[0].Availabilities[0].OrderManagementData.Price;
                const title = game.LocalizedProperties[0].ProductTitle;
                const linkTitle = title
                  .replace(/[^a-zA-Z0-9- ]/g)
                  .toLowerCase()
                  .replace(/[ ]/g, '-');

                filtered.push({
                  id: ProductId,
                  title,
                  platform: 'Xbox One',
                  list: ListPrice,
                  msrp: MSRP,
                  url: `https://www.microsoft.com/en-us/p/${linkTitle}/${ProductId}`,
                  thumbnail_url: `https:${game.LocalizedProperties[0].Images[0].Uri}`,
                  thumbnail_key: 'a',
                  source: SRC,
                  updated
                });
              }
              return filtered;
            }, []);
            // do something with gameData
            try {
              logger.info(`${SRC} Inserting ${gameData.length}`);
              await db.insertList(gameData);
            } catch (error) {
              logger.error(error.message, error.stack);
            }
          });
        })
        .catch(error => logger.error(error.message, error.stack));
    } catch (error) {
      logger.error(error.message, error.stack);
    }
  }
};
