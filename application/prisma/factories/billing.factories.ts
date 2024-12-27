import db from '~/db.server';
import { createTestSession } from './session.factories';
import { generateBillingData } from '@fixtures';

export const generateBilling = async (sessionId: string, overrides = {}) => {
  const data = generateBillingData(sessionId);
  return db.billing.create({
    data: {
      ...data,
      sessionId,
      ...overrides,
    },
  });
};

export const createTestBilling = async (overrides = {}) => {
  const session = await createTestSession();
  const billing = await generateBilling(session.id, overrides);
  return { session, billing };
};
