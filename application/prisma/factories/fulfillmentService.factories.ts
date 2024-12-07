import db from '~/db.server';
import { createSampleSession } from './session.factories';
import { sampleFulfillmentService } from '@fixtures/fulfillmentService.fixture';

export const createSampleFulfillmentService = async (overrides = {}) => {
  await createSampleSession();
  await db.fulfillmentService.create({
    data: {
      ...sampleFulfillmentService,
      ...overrides,
    },
  });
};
