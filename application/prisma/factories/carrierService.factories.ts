import { sampleCarrierService } from '@fixtures/carrierService.fixture';
import db from '~/db.server';
import { createSampleSession } from './session.factories';

export const createSampleCarrierService = async (overrides = {}) => {
  await createSampleSession();
  return db.carrierService.create({
    data: {
      ...sampleCarrierService,
      ...overrides,
    },
  });
};
