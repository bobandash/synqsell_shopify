import { simpleFaker } from '@faker-js/faker';
import db from '~/db.server';
import {
  addStripeConnectAccountDb,
  userHasStripeConnectAccount,
} from '../../stripeConnectAccount.server';
import { createSampleSession } from '@factories/session.factories';
import { sampleStripeConnectAccount } from '@fixtures/stripeConnectAccount.fixture';

describe('stripeConnectAccount', () => {
  const nonExistentId = simpleFaker.string.uuid();
  let sessionId: string;

  beforeEach(async () => {
    const session = await createSampleSession();
    sessionId = session.id;
    await db.stripeConnectAccount.create({
      data: sampleStripeConnectAccount(sessionId),
    });
  });

  describe('userHasStripeConnectAccount', () => {
    it('should return true if has stripe connect account', async () => {
      const hasAccount = await userHasStripeConnectAccount(sessionId);
      expect(hasAccount).toBe(true);
    });

    it('should return false if user does not have stripe connect account', async () => {
      await db.stripeConnectAccount.deleteMany({});
      const hasAccount = await userHasStripeConnectAccount(sessionId);
      expect(hasAccount).toBe(false);
    });

    it(`should return false if session id doesn't exist`, async () => {
      const hasAccount = await userHasStripeConnectAccount(nonExistentId);
      expect(hasAccount).toBe(false);
    });
  });

  describe('hasStripeConnectAccount', () => {
    it('should throw error if trying to add stripe connect account when already exists', async () => {
      const stripeAccountId = simpleFaker.string.uuid();
      await expect(
        addStripeConnectAccountDb(sessionId, stripeAccountId),
      ).rejects.toThrow();
    });

    it('should throw error if nonexistent session id', async () => {
      const stripeAccountId = simpleFaker.string.uuid();
      await expect(
        addStripeConnectAccountDb(nonExistentId, stripeAccountId),
      ).rejects.toThrow();
    });

    it('should successfully add stripe connect account', async () => {
      await db.stripeConnectAccount.deleteMany({});
      const stripeAccountId = simpleFaker.string.uuid();
      await addStripeConnectAccountDb(sessionId, stripeAccountId);
      const hasStripeConnectAccount = await db.stripeConnectAccount.count({
        where: {
          stripeAccountId: stripeAccountId,
        },
      });
      expect(hasStripeConnectAccount).toBe(1);
    });
  });
});
