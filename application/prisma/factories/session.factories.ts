import { generateSessionData } from '@fixtures';
import db from '~/db.server';

export const createTestSession = async (overrides = {}) => {
  const data = generateSessionData();
  return db.session.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};
