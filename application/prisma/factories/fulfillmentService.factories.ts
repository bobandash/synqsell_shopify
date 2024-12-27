import db from '~/db.server';
import { generateFulfillmentServiceData } from '@fixtures';
import { createTestSession } from './session.factories';

export const generateFulfillmentService = async (
  sessionId: string,
  overrides = {},
) => {
  const data = generateFulfillmentServiceData(sessionId);
  return db.fulfillmentService.create({
    data: {
      ...data,
      sessionId,
      ...overrides,
    },
  });
};

export const createTestFulfillmentService = async (overrides = {}) => {
  const session = await createTestSession();
  const fulfillmentService = await generateFulfillmentService(
    session.id,
    overrides,
  );
  return { session, fulfillmentService };
};
