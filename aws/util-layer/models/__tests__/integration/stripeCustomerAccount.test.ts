import { simpleFaker } from "@faker-js/faker/.";
import {
  DatabaseSetup,
  disconnectClient,
  setupDatabase,
  teardownPool,
} from "~/test-db-setup";
import {
  TestStripeCustomerAccount,
  createTestStripeCustomerAccount,
} from "@db/factories/stripeCustomerAccount.factories";
import {
  getStripeCustomerId,
  hasStripeCustomerAccount,
  updatePaymentMethodStatus,
} from "../../stripeCustomerAccount";
import db from "@db/test-db";

describe("Stripe Customer Account", () => {
  let stripeCustomerAccountDetails: TestStripeCustomerAccount;
  let database: DatabaseSetup;
  const nonExistentId = simpleFaker.string.uuid();
  beforeEach(async () => {
    database = await setupDatabase();
    stripeCustomerAccountDetails = await createTestStripeCustomerAccount(true);
  });

  afterEach(() => {
    disconnectClient(database.client);
  });

  afterAll(async () => {
    teardownPool(database.pool);
  });

  describe("hasStripeCustomerAccount", () => {
    it("should return true if retailer has stripe customer account", async () => {
      const { session } = stripeCustomerAccountDetails;
      const { client } = database;
      const res = await hasStripeCustomerAccount(session.id, client);
      expect(res).toBe(true);
    });

    it("should return false if retailer id is invalid", async () => {
      const { client } = database;
      const res = await hasStripeCustomerAccount(nonExistentId, client);
      expect(res).toBe(false);
    });
  });

  describe("getStripeCustomerId", () => {
    it("should return stripe customer id", async () => {
      const { session, stripeCustomerAccount } = stripeCustomerAccountDetails;
      const { client } = database;
      const res = await getStripeCustomerId(session.id, client);
      expect(res).toBe(stripeCustomerAccount.stripeCustomerId);
    });

    it("should throw error if session id is invalid", async () => {
      const { client } = database;
      await expect(getStripeCustomerId(nonExistentId, client)).rejects.toThrow(
        "No stripe customer id exists."
      );
    });

    it("should throw error if session id does not have stripe customer account", async () => {
      const { client } = database;
      const { session } = stripeCustomerAccountDetails;
      await db.stripeCustomerAccount.delete({
        where: {
          retailerId: session.id,
        },
      });
      await expect(getStripeCustomerId(session.id, client)).rejects.toThrow(
        "No stripe customer id exists."
      );
    });
  });

  describe("updatePaymentMethodStatus", () => {
    it("should successfully update payment method status for customerId", async () => {
      const { session, stripeCustomerAccount } = stripeCustomerAccountDetails;
      const { client } = database;
      await updatePaymentMethodStatus(
        stripeCustomerAccount.stripeCustomerId,
        false,
        client
      );
      const newAccount = await db.stripeCustomerAccount.findFirst({
        where: {
          retailerId: session.id,
        },
      });
      expect(stripeCustomerAccount.hasPaymentMethod).toBe(true);
      expect(newAccount?.hasPaymentMethod).toBe(false);
    });

    it("should not throw error if stripe customer id is invalid", async () => {
      const { client } = database;
      await expect(
        updatePaymentMethodStatus(nonExistentId, false, client)
      ).rejects.toThrow("Stripe customer id does not exist.");
    });
  });
});
