const logger = require('pino')();
const s3 = require('../../services/s3');
const processContainer = require('./processContainer')
const { BUCKET_NAME, instance } = require('./support')

// axios.interceptors.request.use(request => {
//   logger.info('Starting Request', request);
//   return request;
// });
s3.CheckForBucketCreateIfNotExist(BUCKET_NAME);

const createRegionDealBaseInfo = ({lang, region, num}) => {
  return { 
    lang,
    region,
    num,
    url: `/${lang}/${region}/${num}/storefront/STORE-MSF77008-BASE`
  }
}

const extractContainers = (res) => {
  return res.data.attributes.navigation[0].submenu[2].items
    .map(e => ({ name: e.name, container: e['target-container-id']}))
    .filter(e => !e.container.includes('ALLDEALS'))
}

module.exports = {
  retrieveData: async () => {
    logger.info('Starting PSN data retrieval');

    // Define Regions
    const regions = [
      { lang: 'en', region: 'US', num: 19 },
      { lang: 'pt', region: 'BR', num: 19 }
    ]

    // Retrieve Region
    regions.map(createRegionDealBaseInfo)
      .forEach(async ({ lang, region, num, url }) => {
        let res = await instance.get(url)
        extractContainers(res.data)
          .map(e => ({ 
            lang, 
            region, 
            num,
            container: e.container,
            name: e.name }))
          .forEach(processContainer)
      })
  }
};
