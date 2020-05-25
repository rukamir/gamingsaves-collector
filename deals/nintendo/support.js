const axios = require('axios');

module.exports = {
  SRC: 'nintendo',
  BUCKET_NAME: 'gamingsaves',
  createPriceURL: (nsuidList, region, lang) => {
    return `https://api.ec.nintendo.com/v1/price?country=${region.toUpperCase()}&lang=${lang.toLowerCase()}&ids=${nsuidList.join(',')}`
  },
  instance: axios.create({
    baseURL:
      'https://u3b6gr4ua3-dsn.algolia.net/1/indexes/*/queries?x-algolia-agent=Algolia%20for%20vanilla%20JavaScript%20(lite)%203.22.1%3BJS%20Helper%202.20.1&x-algolia-application-id=U3B6GR4UA3&x-algolia-api-key=9a20c93440cf63cf1a7008d75f7438bf',
    timeout: 3500,
    headers: {
      Referer: 'https://www.nintendo.com/games/game-guide/',
      Origin: 'https://www.nintendo.com',
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
    }
  })
}