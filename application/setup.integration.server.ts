import testDb from '@db/test-db';

jest.mock('~/db.server', () => {
  return {
    __esModule: true,
    default: testDb,
  };
});
