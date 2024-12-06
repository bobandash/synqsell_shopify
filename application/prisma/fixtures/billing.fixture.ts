import { PLANS } from '~/constants';
import { sampleSession } from './session.fixture';

export const sampleBilling = {
  id: 'test-billing-1',
  shopifySubscriptionLineItemId: 'test-line-item-id',
  plan: PLANS.BASIC_PLAN,
  sessionId: sampleSession.id,
};
