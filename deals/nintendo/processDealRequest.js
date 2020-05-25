const logger = require('pino')()
const { SRC, BUCKET_NAME, createPriceURL } = require('./support')
const axios = require('axios')
const { handleThumbnail } = require('../../services/support')
const db = require('../../services/db')

module.exports = async r => {
  let lang = 'en', region = 'US'
  var formatedGamesList = r.data.results[0].hits.map((e, i) => {
    const {
      nsuid,
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
      categories,
      publishers = null,
      developers = null,
      locale
    } = e;
    const thumbnail_url = `https://nintendo.com${boxArt}`;
    const cleanedTitle = title.replace(/[^\x00-\xFF]/g, '');
    const publisher = !!publishers ? publishers[0] : null;
    const developer = !!developers ? developers[0] : null;

    [lang, region] = locale.split('_')
    const thumbnailKey = `${SRC}/${region}/${lang}/${objectID}`
    handleThumbnail(axios, BUCKET_NAME, thumbnailKey, SRC, thumbnail_url, logger);
    db.addGenres(cleanedTitle, categories)
    const updated = new Date()

    return {
      id: objectID,
      nsuid,
      title: cleanedTitle,
      platform,
      thumbnail_url,
      thumbnail_key: thumbnailKey,
      url: `https://nintendo.com${url}`,
      msrp,
      list: salePrice,
      sale_end: null,
      group: SRC,
      group_name: SRC,
      source: SRC,
      description: description.replace(/[^\x00-\xFF]/g, ''),
      updated,
      date: updated,
      release: new Date(releaseDateMask),
      rating: esrb,
      genres: categories,
      publisher,
      developer,
      region,
      lang
    };
  });

  // // Get Price and expiration
  // // Has super low rate limit. brain storm later
  // const nsuidList = formatedGamesList
  //   .map(e => e.nsuid)
  // const qList = []
  
  // while (nsuidList.length > 8) {
  //   qList.push(nsuidList.splice(0, 8))
  // }
  // if (qList.length) qList.push(nsuidList)
  // console.log(qList)

  // for (const grp in qList) {
  //   console.log('loop')
  //   try {
  //     console.log(grp)
  //     const { data } = await axios.get(
  //       'https://api.ec.nintendo.com/v1/price', 
  //       { 
  //         params: {
  //           country: region,
  //           lang: lang,
  //           ids: qList[grp].join(',')
  //         } 
  //       }
  //     )

  //     data.prices.forEach(price => {
  //       const { discount_price, regular_price, title_id } = price
  //       formatedGamesList.find((game, i) => {
  //           if (game.nsuid === title_id) {
  //             this[i].list = discount_price.raw_value
  //             this[i].msrp = regular_price.raw_value
  //             this[i].sale_end = new Date(discount_price.end_datetime)
  //           }
  //           console.log(game.sale_end)
  //         },
  //         formatedGamesList)
  //     })
  //     console.log(formatedGamesList[0])
  //   } catch(e) {
  //     logger.warn(`${SRC} Error calling price api`, e.message)
  //     logger.warn(e.request.url)
  //     logger.warn(e.request.path)
  //   }
  // }

  logger.info(`${SRC} Inserting ${formatedGamesList.length}`);
  db.addGamesToDB(formatedGamesList);
}
