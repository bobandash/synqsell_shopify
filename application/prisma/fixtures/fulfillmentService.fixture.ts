import { sampleSession } from './session.fixture';
import { simpleFaker } from '@faker-js/faker';

export const sampleFulfillmentService = {
  id: simpleFaker.string.uuid(),
  sessionId: sampleSession.id,
  shopifyFulfillmentServiceId: simpleFaker.string.alphanumeric(10),
  shopifyLocationId: simpleFaker.string.alphanumeric(10),
};
