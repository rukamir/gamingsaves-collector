const axios = require('axios');
const logger = require('pino')();
const { SRC, BUCKET_NAME } = require('./support')
const db = require('../../services/db')
const { handleThumbnail } = require('../../services/support');

const getRating = psnRatingUrl => {
  const rating = psnRatingUrl
    .split('/')
    .pop()
    .split('.')[0];
  return rating.toUpperCase()
};

const getRequestInfo = path => {
  return {
    language: path.split('/')[2],
    region: path.split('/')[3],
    container: path.split('/')[6].split('?')[0]
  }
}

module.exports = async res => {
  const updated = new Date();
  const saleInfo = res.data.data.attributes
  const container = res.data.data.id
  const gamesContentTypeOne = res.data.included.filter(
    elem => !!elem.attributes['content-type'] && elem.attributes['content-type'] == '1'
  );
  const { language, region } = getRequestInfo(res.request.path)

  var gameList = gamesContentTypeOne.map(e => {
    const { id, attributes } = e;
    const title = attributes.name.replace(/[^\x00-\xFF]/g, '');
    const thumbnailURL = attributes['thumbnail-url-base'];
    const genres = attributes.genres;
    const release = attributes['release-date'];
    const description = attributes['long-description'];
    const publisher = attributes['provider-name'];
    const rating = getRating(attributes['content-rating'].url);
    const list = parseFloat(
      attributes.skus[0].prices['plus-user']['actual-price'].display.split('$')[1]
    );
    let msrp
    if (!attributes.skus[0].prices['plus-user']['strikethrough-price']) {
      msrp = list
    } else {
      msrp = parseFloat(
        attributes.skus[0].prices['plus-user']['strikethrough-price'].display.split('$')[1]
      );
    }
    const sale_end = new Date(attributes.skus[0].prices['plus-user'].availability['end-date'])

    const thumbnailKey = `${SRC}/${region}/${language}/${id}`
    handleThumbnail(axios, BUCKET_NAME, thumbnailKey, SRC, thumbnailURL, logger);
    db.addGenres(title, genres);

    return {
      id,
      title,
      platform: attributes.platforms[0],
      lang: language,
      region,
      thumbnail_url: thumbnailURL,
      thumbnail_key: thumbnailKey,
      msrp,
      list,
      sale_end,
      group_img: saleInfo['thumbnail-url-base'],
      group_name: saleInfo.name,
      group: container,
      url: `https://store.playstation.com/${language}-${region.toLowerCase()}/product/${id}`,
      source: SRC,
      description: description.replace(/[^\x00-\xFF]/g, ''),
      rating,
      release: new Date(release),
      updated,
      date: updated,
      genres,
      publisher
    };
  });
  // insert into db
  db.addGamesToDB(gameList);
}