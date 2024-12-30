import {
  createTestStripeConnectAccount,
  TestStripeConnectAccount,
} from "@db/factories/stripeConnectAccount.factories";
import { simpleFaker } from "@faker-js/faker/.";
import {
  DatabaseSetup,
  disconnectClient,
  setupDatabase,
  teardownPool,
} from "./setup/db-setup";
import db from "@db/test-db";
import {
  deleteStripeConnectAccount,
  getStripeAccountId,
  hasStripeConnectAccount,
} from "../../stripeConnectAccount";

describe("stripeConnectAccount", () => {
  let database: DatabaseSetup;
  let stripeConnectDetails: TestStripeConnectAccount;
  const nonExistentId = simpleFaker.string.uuid();
  beforeEach(async () => {
    database = await setupDatabase();
    stripeConnectDetails = await createTestStripeConnectAccount();
  });

  afterEach(() => {
    disconnectClient(database.client);
  });

  afterAll(async () => {
    teardownPool(database.pool);
  });

  describe("getStripeAccountId", () => {
    it("should return stripe connect account id", async () => {
      const { stripeConnectAccount, session } = stripeConnectDetails;
      const { client } = database;
      const res = await getStripeAccountId(session.id, client);
      expect(res).toBe(stripeConnectAccount.stripeAccountId);
    });

    it("should throw error if stripe connect account id is invalid", async () => {
      const { client } = database;
      await expect(getStripeAccountId(nonExistentId, client)).rejects.toThrow(
        "No stripe connect account id exists."
      );
    });
  });

  describe("hasStripeConnectAccount", () => {
    it("should return true if session has stripe connect account", async () => {
      const { session } = stripeConnectDetails;
      const { client } = database;
      const res = await hasStripeConnectAccount(session.id, client);
      expect(res).toBe(true);
    });

    it("should return false if session does not have stripe connect account", async () => {
      const { client } = database;
      const res = await hasStripeConnectAccount(nonExistentId, client);
      expect(res).toBe(false);
    });
  });

  describe("deleteStripeConnectAccount", () => {
    it("should successfully delete stripe connect account given account id", async () => {
      const { stripeConnectAccount } = stripeConnectDetails;
      const { client } = database;
      const numAccountBefore = await db.stripeConnectAccount.count({
        where: {
          stripeAccountId: stripeConnectAccount.stripeAccountId,
        },
      });
      await deleteStripeConnectAccount(
        stripeConnectAccount.stripeAccountId,
        client
      );
      const numAccountAfter = await db.stripeConnectAccount.count({
        where: {
          stripeAccountId: stripeConnectAccount.stripeAccountId,
        },
      });
      expect(numAccountBefore).toBe(1);
      expect(numAccountAfter).toBe(0);
    });

    it("should not throw if stripe connect account id is invalid", async () => {
      const { client } = database;
      await deleteStripeConnectAccount(nonExistentId, client);
    });
  });
});
