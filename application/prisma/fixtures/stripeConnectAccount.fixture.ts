import { simpleFaker } from '@faker-js/faker';

export const sampleStripeConnectAccount = (sessionId: string) => ({
  id: simpleFaker.string.uuid(),
  stripeAccountId: simpleFaker.string.uuid(),
  supplierId: sessionId,
  createdAt: simpleFaker.date.recent(),
  updatedAt: simpleFaker.date.recent(),
});
