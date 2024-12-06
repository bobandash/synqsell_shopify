import { sampleSession } from '../fixtures/session.fixture';
import db from '~/db.server';

export const createSampleSession = async (overrides = {}) => {
  return db.session.create({
    data: {
      ...sampleSession,
      ...overrides,
    },
  });
};
