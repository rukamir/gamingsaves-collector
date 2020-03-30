const knex = require('knex')({
  client: 'mysql',
  connection: {
    host: process.env.DB_ADDRESS,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  }
});

var DateString = myDate => {
  return (
    myDate.getUTCFullYear() +
    '/' +
    ('0' + (myDate.getUTCMonth() + 1)).slice(-2) +
    '/' +
    ('0' + myDate.getUTCDate()).slice(-2) +
    ' ' +
    ('0' + myDate.getUTCHours()).slice(-2) +
    ':' +
    ('0' + myDate.getUTCMinutes()).slice(-2) +
    ':' +
    ('0' + myDate.getUTCSeconds()).slice(-2)
  );
};
const convertToDBEntry = item => {
  const costRatio = item.list / item.msrp;
  return {
    id: item.id,
    title: item.title,
    platform: item.platform,
    list_price: item.list,
    msrp_price: item.msrp,
    discount: Math.floor(100 - 100 * costRatio),
    url: item.url,
    thumbnail_url: item.thumbnail_url,
    thumbnail_key: item.thumbnail_key,
    source: item.source,
    desc: item.description,
    release: item.release,
    rating: item.rating,
    updated: DateString(item.updated)
  };
};

module.exports = {
  selectAllDeals: () => {
    return knex.select().from('deals');
  },
  isThumbnailSaved: async (id, source) => {
    let found = false;
    try {
      const foundResults = await knex.raw(
        'SELECT EXISTS(SELECT * FROM thumbnail WHERE `id` = ? AND `source` = ?) AS `exists`',
        [id, source]
      );
      found = !!foundResults[0][0].exists;
    } catch (err) {
      console.log(err);
    }
    return found;
  },
  insertThumbnailMetadata: (key, src) => {
    return knex('thumbnail').insert({ id: key, source: src });
  },
  isMetacriticSaved: async (title, platform, score) => {
    let found = false;
    try {
      const foundResults = await knex.raw(
        'SELECT EXISTS(SELECT * FROM metacritic WHERE `title` = ? AND `platform` = ?) AS `exists`',
        [title, platform]
      );
      found = !!foundResults[0][0].exists;
    } catch (err) {
      console.log(err);
    }
    return found;
  },
  insertMetacritic: (title, platform, score) => {
    return knex('metacritic').insert({ title, platform, score });
  },
  getListOfMissingMetacritic: limit => {
    return knex.raw(
      'SELECT a.`title`, a.`platform` FROM game.deals a NATURAL LEFT JOIN game.metacritic b WHERE b.`title` IS NULL LIMIT ?',
      [limit]
    );
  },
  countBySource: () => {
    return knex('deals')
      .select('source')
      .count('source as count')
      .groupBy('source')
      .orderBy('source');
  },
  insertList: list => {
    const formated = list.map(convertToDBEntry);
    return knex('deals').insert(formated);
  },
  deleteBySource: src => {
    return knex('deals')
      .where('source', src)
      .delete();
  }
};
