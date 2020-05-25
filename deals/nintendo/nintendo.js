const logger = require('pino')();
const axios = require('axios');
const db = require('../../services/db');
const s3 = require('../../services/s3');
const processDealRequest = require('./processDealRequest')
const { SRC, instance } = require('./support')

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

    const regions = [
      { lang: 'en', region: 'US' }
    ]

    regions.forEach(async ({ lang, region }) => {
      try {
        const resp = await instance.post('', createNintendoQueryBody(0, 30));
        const salesCount = resp.data.results[1].facets.generalFilters.Deals;
  
        var sourceCounts = await db.countByGroup(SRC, region, lang, SRC);
        
        let filteredCount = sourceCounts.find(srcCnt => srcCnt.dealgroup === SRC);
        if (!!filteredCount && filteredCount.count == salesCount) {
          logger.info(`${SRC} number of deals did not change. Skipping update.`);
          return;
        }
  
        logger.info(`${SRC} number of deals changed. Updating deals.`);
        db.createPriceHistSetToMSRPByGroup(SRC, SRC, lang, region)
        db.deleteDealsByGroup(SRC, SRC, lang, region)
          .catch(e => logger.warn(`${SRC} error deleting deals`, e.message))    
  
        var currentIndex = 0;
        const groupSize = 42;
        var requestList = [];
        while (currentIndex < salesCount / groupSize) {
          requestList.push(instance.post('', createNintendoQueryBody(currentIndex, groupSize)));
          currentIndex += 1;
        }
  
        Promise.all(requestList)
          .then(resp => {
            resp.forEach(processDealRequest);
          })
          .catch(error => {
            logger.error(`${SRC} 2`, error.message);
          });
      } catch (error) {
        logger.error(`${SRC} 3`, error.message);
      }
    })
  }
};
