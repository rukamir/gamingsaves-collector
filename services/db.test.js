const db = require('./db');
jest.mock('knex');
var knex = require('knex')();

describe('DB Tests', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  test('Testing A', () => {
    expect(true).toBe(true);
  });
});
