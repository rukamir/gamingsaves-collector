const axios = require('axios');

module.exports =  {
  SRC: 'psn',
  BUCKET_NAME: 'gamingsaves',
  createPageURL: (lang, region, num, container, size, page) => {
    return `/${lang}/${region}/${num}/container/${container}?size=${size}&bucket=games&start=${page}`
  },
  instance: axios.create({
    baseURL: 'https://store.playstation.com/valkyrie-api',
    timeout: 8000,
    headers: {
      'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
  }
  })
}