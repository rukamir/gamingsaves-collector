const logger = require('pino')()
const axios = require('axios')
const db = require('../services/db')
const { handleThumbnail } = require('../services/support')
const _get = require('lodash/get')

const SRC = 'xbox'
const BUCKET_NAME = 'gamingsaves'

module.exports = {
  retrieveData: async () => {
    logger.info('Starting Xbox retrieval')
    const updated = new Date()
    const regions = [
      { lang: 'en', region: 'US' }
    ]

    regions.forEach(async ({ lang, region }) => {
      try {
        db.createPriceHistSetToMSRPByGroup(SRC, SRC, lang, region)
        db.deleteDealsByGroup(SRC, SRC, lang, region)
          .catch(e => logger.warn(`${SRC} error deleting deals`, e.message))
        const resp = await axios.get(
          `https://www.xbox.com/${lang}-${region}/games/xbox-one/js/xcat-bi-urls.json`,
          {
            timeout: 4500
          }
        );
  
        var rawGameList = resp.data
          .split(';')
          .filter(e => e.includes('fullGameArray'))[0]
          .split('= ')[1]
        var gameList = JSON.parse(rawGameList)
        var qStrList = []
        while (gameList.length > 20) {
          qStrList.push(gameList.splice(0, 20))
        }
        if (qStrList.length) qStrList.push(gameList)

        const requestList = qStrList
          .map(e => {
            return `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${e.join(
              ','
            )}&market=US&languages=${lang}-${region.toLowerCase()}&MS-CV=DGU1mcuYo0WMMp+F.1`;
          })
          .map(urlQuery => {
            return axios.get(urlQuery, {
              // timeout: 25000,
              headers: {
                Origin: 'https://www.xbox.com',
                Referer: `https://www.xbox.com/${lang}-${region}/games/xbox-one?cat=onsale`,
                'User-Agent':
                  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
              }
            });
          });
  
        Promise.all(requestList)
          .then(respList => {
            respList.forEach(async resp => {
              const gameData = resp.data.Products.reduce((filtered, game) => {
                const { ListPrice, MSRP } = _get(
                  game,
                  'DisplaySkuAvailabilities[0].Availabilities[0].OrderManagementData.Price',
                  { MSRP: 0, ListPrice: 0 }
                )
                const sale_end = _get(
                  game,
                  'DisplaySkuAvailabilities[0].Availabilities[0].Conditions.EndDate',
                  null
                )

                if (!(ListPrice < MSRP)) return filtered
  
                const { ProductId } = game;
                const title = game.LocalizedProperties[0].ProductTitle;
                const {
                  ProductTitle,
                  Images,
                  ShortDescription,
                  DeveloperName,
                  PublisherName
                } = game.LocalizedProperties[0];
                const { OriginalReleaseDate, ContentRatings } = game.MarketProperties[0];
                const rating = ContentRatings.find(rating => rating.RatingSystem == 'ESRB')
                  .RatingId.split(':')
                  .pop();
                
                let imgUri = null
                try {
                  imgUri = Images.find(image => image.ImagePurpose == 'Poster' 
                    || image.ImagePurpose == 'BoxArt' ).Uri
                } catch (e) {
                  imgUri = null
                }

                const thumbnail_url = !!imgUri ? `https:${imgUri}` : null
                const linkTitle = title
                  .replace(/[^a-zA-Z0-9- ]/g)
                  .toLowerCase()
                  .replace(/[ ]/g, '-')

                const thumbnailKey = `${SRC}/${region}/${lang}/${ProductId}`
                if (!!thumbnail_url) handleThumbnail(axios, BUCKET_NAME, thumbnailKey, SRC, thumbnail_url, logger);

                filtered.push({
                  id: ProductId,
                  title: ProductTitle.replace(/[^\x00-\xFF]/g, ''),
                  platform: 'Xbox One',
                  list: ListPrice,
                  msrp: MSRP,
                  lang,
                  region,
                  url: `https://www.microsoft.com/${lang}-${region.toLowerCase()}/p/${linkTitle}/${ProductId}`,
                  thumbnail_url,
                  thumbnail_key: thumbnailKey,
                  release: new Date(OriginalReleaseDate),
                  rating,
                  description: ShortDescription.replace(/[^\x00-\xFF]/g, ''),
                  source: SRC,
                  updated,
                  date: updated,
                  developer: DeveloperName.replace(/[^\x00-\xFF]/g, ''),
                  publisher: PublisherName.replace(/[^\x00-\xFF]/g, ''),
                  sale_end: new Date(sale_end),
                  group: SRC,
                  group_name: SRC,
                })

                return filtered
              }, [])
  
              if (gameData.length) {
                logger.info(`${SRC} Inserting ${gameData.length}`);
                db.addGamesToDB(gameData);
              }
            })
          })
          .catch(error => logger.error(error.message, error.stack));
      } catch (error) {
        logger.error(error.message, error.stack);
      }
    })
  }
}
