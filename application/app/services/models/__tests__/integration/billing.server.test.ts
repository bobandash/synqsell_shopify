import { createTestBilling } from '@factories/billing.factories';
import { v4 as uuidv4 } from 'uuid';
import { addBilling, userHasBilling } from '../../billing.server';
import { PLANS } from '~/constants';
import db from '~/db.server';
import { createTestSession } from '@factories/session.factories';
import type { Session } from '@prisma/client';

describe('Billing', () => {
  const nonExistentSessionId = uuidv4();

  describe('userHasBilling', () => {
    let sessionId: string;

    beforeEach(async () => {
      const { session } = await createTestBilling();
      sessionId = session.id;
    });

    it('should return true when billing is added to session', async () => {
      await createTestBilling();
      const billingExists = await userHasBilling(sessionId);
      expect(billingExists).toBe(true);
    });

    it('should return false if billing is not added to session', async () => {
      const billingExists = await userHasBilling(nonExistentSessionId);
      expect(billingExists).toBe(false);
    });
  });

  describe('addBilling', () => {
    let session: Session;
    beforeEach(async () => {
      const newSession = await createTestSession();
      session = newSession;
    });

    it('should successfully add billing to sessionId', async () => {
      await addBilling(session.id, 'test-line-item-id', PLANS.BASIC_PLAN);
      const hasBilling =
        (await db.billing.count({
          where: {
            sessionId: session.id,
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
      await addBilling(session.id, 'test-line-item-id', PLANS.BASIC_PLAN);
      await addBilling(session.id, 'test-line-item', PLANS.BASIC_PLAN);
      const numberBillings = await db.billing.count({
        where: { sessionId: session.id },
      });
      expect(numberBillings).toBe(2);
    });

    it(`should store billings properly`, async () => {
      const lineItemId = 'test-line-item-id';
      await addBilling(session.id, lineItemId, PLANS.BASIC_PLAN);
      const billing = await db.billing.findFirst({
        where: { sessionId: session.id },
      });
      expect(billing).toMatchObject({
        sessionId: session.id,
        shopifySubscriptionLineItemId: lineItemId,
        plan: PLANS.BASIC_PLAN,
      });
    });
  });
});
