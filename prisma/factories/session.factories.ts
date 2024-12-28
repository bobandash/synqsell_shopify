import { generateSessionData } from "@db/fixtures";
import db from "@db/test-db";

export const createTestSession = async (overrides = {}) => {
  const data = generateSessionData();
  return db.session.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};
