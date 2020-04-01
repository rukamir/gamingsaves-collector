const logger = require('pino')();
const axios = require('axios');
const db = require('../services/db');
const s3 = require('../services/s3');
const { handleThumbnail } = require('../services/support');

const instance = axios.create({
  baseURL:
    'https://u3b6gr4ua3-dsn.algolia.net/1/indexes/*/queries?x-algolia-agent=Algolia%20for%20vanilla%20JavaScript%20(lite)%203.22.1%3BJS%20Helper%202.20.1&x-algolia-application-id=U3B6GR4UA3&x-algolia-api-key=9a20c93440cf63cf1a7008d75f7438bf',
  timeout: 2000,
  headers: {
    Referer: 'https://www.nintendo.com/games/game-guide/',
    Origin: 'https://www.nintendo.com',
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
  }
});

const SRC = 'nintendo';
const BUCKET_NAME = 'nintendo';
s3.CheckForBucketCreateIfNotExist(BUCKET_NAME);
// eShop
const createNintendoQueryBody = (page, resultsPerPage) => {
  return {
    requests: [
      {
        indexName: 'noa_aem_game_en_us',
        params: `query=&hitsPerPage=${resultsPerPage}&maxValuesPerFacet=30&page=${page}&facets=%5B%22generalFilters%22%2C%22platform%22%2C%22availability%22%2C%22categories%22%2C%22filterShops%22%2C%22virtualConsole%22%2C%22characters%22%2C%22priceRange%22%2C%22esrb%22%2C%22filterPlayers%22%5D&tagFilters=&facetFilters=%5B%5B%22generalFilters%3ADeals%22%5D%5D`
      },
      {
        indexName: 'noa_aem_game_en_us',
        params:
          'query=&hitsPerPage=1&maxValuesPerFacet=30&page=0&attributesToRetrieve=%5B%5D&attributesToHighlight=%5B%5D&attributesToSnippet=%5B%5D&tagFilters=&facets=generalFilters'
      }
    ]
  };
};

module.exports = {
  retrieveData: async () => {
    logger.info('Starting Nintendo retrieval');
    const updated = new Date();

    try {
      const resp = await instance.post('', createNintendoQueryBody(0, 30));
      const salesCount = resp.data.results[1].facets.generalFilters.Deals;

      var sourceCounts = await db.countBySource(SRC);
      let filteredCount = sourceCounts.find(srcCnt => srcCnt.source === SRC);
      if (!!filteredCount && filteredCount.count == salesCount) {
        logger.info(`${SRC} number of deals did not change. Skipping update.`);
        return;
      }

      await db.deleteBySource(SRC);

      var currentIndex = 0;
      const groupSize = 42;
      var requestList = [];
      while (currentIndex < salesCount / groupSize) {
        requestList.push(instance.post('', createNintendoQueryBody(currentIndex, groupSize)));
        currentIndex += 1;
      }

      Promise.all(requestList)
        .then(resp => {
          resp.forEach(async r => {
            var formatedGamesList = r.data.results[0].hits.map((e, i) => {
              const {
                objectID,
                title,
                platform = 'unavailable',
                boxArt,
                msrp,
                salePrice,
                url,
                description,
                releaseDateMask,
                esrb,
                categories
              } = e;
              const thumbnail_url = `https://nintendo.com${boxArt}`;
              const cleanedTitle = title.replace(/[^\x00-\xFF]/g, '');

              handleThumbnail(axios, BUCKET_NAME, objectID, SRC, thumbnail_url, logger);
              db.addGenres(cleanedTitle, categories);

              return {
                id: objectID,
                title: cleanedTitle,
                platform,
                thumbnail_url,
                thumbnail_key: `${objectID}`,
                url: `https://nintendo.com${url}`,
                msrp,
                list: salePrice,
                source: SRC,
                description: description.replace(/[^\x00-\xFF]/g, ''),
                updated,
                date: updated,
                release: new Date(releaseDateMask),
                rating: esrb,
                genres: categories
              };
            });
            try {
              logger.info(`${SRC} Inserting ${formatedGamesList.length}`);
              await db.insertList(formatedGamesList);
              db.addGamesToDB(formatedGamesList);
            } catch (err) {
              logger.error(`${SRC} 1`, err.message);
            }
          });
        })
        .catch(error => {
          logger.error(`${SRC} 2`, error);
        });
    } catch (error) {
      logger.error(`${SRC} 3`, error);
    }
  }
};
