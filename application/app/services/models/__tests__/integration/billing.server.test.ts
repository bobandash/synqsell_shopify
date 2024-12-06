import { createSampleBilling } from '@factories/billing.factories';
import { v4 as uuidv4 } from 'uuid';
import { addBilling, userHasBilling } from '../../billing.server';
import { sampleSession } from '@fixtures/session.fixture';
import { createSampleSession } from '@factories/session.factories';
import { PLANS } from '~/constants';
import db from '~/db.server';

describe('Billing', () => {
  const nonExistentSessionId = uuidv4();

  describe('userHasBilling', () => {
    it('should return true when billing is added to session', async () => {
      await createSampleBilling();
      const billingExists = await userHasBilling(sampleSession.id);
      expect(billingExists).toBe(true);
    });

    it('should return false if billing is not added to session', async () => {
      const billingExists = await userHasBilling(sampleSession.id);
      expect(billingExists).toBe(false);
    });

    it('should return false if sessionId input is incorrect', async () => {
      await createSampleBilling();
      const billingExists = await userHasBilling(nonExistentSessionId);
      expect(billingExists).toBe(false);
    });
  });

  describe('addBilling', () => {
    it('should successfully add billing to sessionId', async () => {
      await createSampleSession();
      await addBilling(sampleSession.id, 'test-line-item-id', PLANS.BASIC_PLAN);
      const hasBilling =
        (await db.billing.count({
          where: {
            sessionId: sampleSession.id,
          },
        })) > 0;
      expect(hasBilling).toBe(true);
    });

    it(`should fail when session doesn't exist`, async () => {
      await expect(
        addBilling(nonExistentSessionId, 'test-line-item', PLANS.BASIC_PLAN),
      ).rejects.toThrow();
    });

    it(`should add multiple billings when called multiple times`, async () => {
      await createSampleSession();
      await addBilling(sampleSession.id, 'test-line-item-id', PLANS.BASIC_PLAN);
      await addBilling(sampleSession.id, 'test-line-item', PLANS.BASIC_PLAN);
      const numberBillings = await db.billing.count({
        where: { sessionId: sampleSession.id },
      });
      expect(numberBillings).toBe(2);
    });

    it(`should store billings properly`, async () => {
      await createSampleSession();
      const lineItemId = 'test-line-item-id';
      await addBilling(sampleSession.id, lineItemId, PLANS.BASIC_PLAN);
      const billing = await db.billing.findFirst({
        where: { sessionId: sampleSession.id },
      });
      expect(billing).toMatchObject({
        sessionId: sampleSession.id,
        shopifySubscriptionLineItemId: lineItemId,
        plan: PLANS.BASIC_PLAN,
      });
    });
  });
});
