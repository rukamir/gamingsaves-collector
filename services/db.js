const logger = require('pino')();
const knex = require('knex')({
  client: 'mysql',
  connection: {
    host: process.env.DB_ADDRESS,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  }
});

const convertToGameEntry = item => {
  return {
    id: item.id,
    title: item.title,
    platform: item.platform,
    msrp: item.msrp,
    url: item.url,
    thumbnail_url: item.thumbnail_url,
    src: item.source,
    desc: item.description,
    release: item.release,
    rating: item.rating,
    pub: item.publisher,
    dev: item.developer,
    region: item.region,
    lang: item.lang
  };
};

const convertToPriceHistEntry = item => {
  return {
    id: item.id,
    list: item.list,
    src: item.source,
    date: item.date
  };
};

const convertToDealEntry = item => {
  const costRatio = item.list / item.msrp;
  return {
    id: item.id,
    list: item.list,
    discount: Math.floor(100 - 100 * costRatio),
    src: item.source,
    date: item.date,
    expire: item.sale_end,
    group: item.group,
    group_name: item.group_name,
    expire: item.sale_end,
    region: item.region,
    lang: item.lang
  };
};

const insertIgnore = (table, data) => {
  return knex.raw(
    knex(table)
      .insert(data)
      .toString()
      .replace(/^insert/i, 'insert ignore')
  );
};

module.exports = {
  selectAllDeals: () => {
    return knex.select().from('deal');
  },
  isThumbnailSaved: async (id, source) => {
    let found = false;
    try {
      const foundResults = await knex.raw(
        'SELECT EXISTS(SELECT * FROM thumbnail WHERE `key` = ? AND `src` = ?) AS `exists`',
        [id, source]
      );
      found = !!foundResults[0][0].exists;
    } catch (err) {
      console.log(err);
    }
    return found;
  },
  insertThumbnailMetadata: (key, src) => {
    return knex('thumbnail').insert({ key, src });
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
      'SELECT a.`title`, a.`platform` FROM game.game a NATURAL LEFT JOIN game.metacritic b WHERE b.`title` IS NULL LIMIT ?',
      [limit]
    );
  },
  countBySource: () => {
    return knex('deal')
      .select('src')
      .count('src as count')
      .groupBy('src')
      .orderBy('src');
  },
  countByGroup: (group, region, language, src) => {
    return knex('deal')
      .select('deal.group as dealgroup')
      .count('* as count')
      .where({ 
        'deal.group': group, 
        'deal.region': region , 
        'deal.lang': language,
        'deal.src': src 
      })
      .groupBy('group')
  },
  getLastUpdateBySource: async src => {
    try {
      const date = await knex('deal')
        .select('date')
        .where({ src })
        .orderBy('date', 'desc')
        .limit(1);

      return date.length ? date[0].date : null;
    } catch (e) {
      logger.error('Unable to get Last Update By Source', e.message);
      return null;
    }
  },
  createPriceHistSetToMSRPBySource: async src => {
    const date = new Date();
    knex
      .raw(
        'INSERT IGNORE INTO game.price_hist ' +
          '(SELECT `id` AS link, ' +
          'DATE(?), ' +
          "(SELECT `msrp` FROM game.game WHERE `id` = link AND `src` = ?), `src` FROM game.price_hist WHERE `src` = 'nintendo' AND `date` = " +
          "(SELECT `date` FROM game.price_hist WHERE `src` = 'nintendo' ORDER BY `date` DESC LIMIT 1))",
        [date, src]
      )
      .catch(err => logger.error('Unable to create MSRP Pirce Histort', err.message));
  },
  createPriceHistSetToMSRPAndClearExpired: async (src, group, region, lang) => {
    const date = new Date();
    knex
      .raw(
        'INSERT IGNORE INTO game.price_hist ' +
          '(SELECT ' + 
            '`id` AS link, ' +
            'DATE(?), ' +
            "(SELECT `msrp` FROM game.game WHERE `id` = link AND `src` = ? AND `region` = ? AND `lang` = ?), " + 
            "`src` " + 
            "`region` " +
            "`lang` " +
          "FROM game.price_hist " + 
          "WHERE `src` = ? AND `date` = " +
            "(SELECT `date` FROM game.price_hist WHERE `src` = ? AND `id` = link AND `region` = ? AND `lang` = ? ORDER BY `date` DESC LIMIT 1) AND `region` = ? AND `lang` = ?)",
        [date, src, region, lang, src, src, region, lang]
      )
      .catch(err => logger.error('Unable to create MSRP Pirce Histort', err.message));
  },
  addGenres: (title, genres) => {
    const genreList = genres.map(e => ({ title, genre: e }));
    insertIgnore('genre', genreList).catch(e => logger.error('Error adding genres', e.message));
  },
  addGamesToDB: list => {
    const gameList = list.map(convertToGameEntry);
    const q1 =
      knex('game')
        .insert(gameList)
        .toString() + ' ON DUPLICATE KEY UPDATE `msrp` = VALUES(`msrp`), `desc` = VALUES(`desc`)';
    knex.raw(q1).catch(err => logger.error('Could not insert game', err.message));

    const dealList = list.map(convertToDealEntry);
    knex('deal')
      .insert(dealList)
      .catch(err => logger.error('Could not insert deal', err.message));

    const priceList = list.map(convertToPriceHistEntry);
    const q2 =
      knex('price_hist')
        .insert(priceList)
        .toString() + ' ON DUPLICATE KEY UPDATE `list` = VALUES(`list`)';
    knex.raw(q2).catch(err => logger.error('Could not insert Price History', err.message));
  },
  deleteBySource: (src, group) => {
    return knex('deal')
      .where({ src, group })
      .delete();
  }
};
