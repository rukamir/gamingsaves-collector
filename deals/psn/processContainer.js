const { createPageURL, SRC, instance } = require('./support')
const db = require('../../services/db')
const processDealRequest = require('./processDealRequest')
const logger = require('pino')();

module.exports= async ({ lang, region, num, container, name }) => {
  // Pull per container
  var saleCount = 0;
  try {
    var firstResp = await instance.get(
      createPageURL(lang, region, num, container, 30, 0)
    );

    saleCount = firstResp.data.data.attributes['total-results'];

    // change to select on container id
    var sourceCounts = await db.countByGroup(container, region, lang, SRC);

    let filteredCount = sourceCounts.find(srcCnt => srcCnt.dealgroup === container);
    if (!!filteredCount && filteredCount.count == saleCount) {
      logger.info(`${SRC} number of deals did not change. Skipping update.`);
      return;
    }

    // might not do this if we expire by timestamp
    // await db.deleteBySource(SRC, container);

    var currentIndex = 0;
    const groupSize = 30;
    var requestList = [];
    // const pullDate = new Date();
    // while (currentIndex < saleCount) {
    while (currentIndex < saleCount) {
      requestList.push(
        instance.get(
          createPageURL(lang, region, num, container, groupSize, currentIndex)
        )
      );
      currentIndex += groupSize;
    }

    Promise.all(requestList)
      .then(req => {
        req.forEach(processDealRequest);
      })
      .catch(err => {
        logger.error(err);
        logger.error(`PSN catch 1 %s `, err.message);
      });
  } catch (e) {
    logger.error(`PSN catch 2 %s `, e.message);
  }
}