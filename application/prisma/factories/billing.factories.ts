import db from '~/db.server';
import { createSampleSession } from './session.factories';
import { sampleBilling } from '@fixtures/billing.fixture';

export const createSampleBilling = async (overrides = {}) => {
  await createSampleSession();
  return db.billing.create({
    data: {
      ...sampleBilling,
      ...overrides,
    },
  });
};
