var knex = jest.genMockFromModule('knex');

knex = () => ({
  test: jest.fn().mockReturnValue('test'),
  select: jest.fn().mockReturnValue(100),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  first: jest.fn().mockReturnThis(),
  then: jest.fn(function(done) {
    console.log('jimmy jimmy jimmy');
    done(null);
  })
});

module.exports = knex;
