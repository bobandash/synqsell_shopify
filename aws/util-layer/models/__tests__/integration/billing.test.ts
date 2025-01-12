import {
  createTestBilling,
  TestBilling,
} from "@db/factories/billing.factories";
import db from "@db/test-db";
import { deleteBilling } from "../../billing";
import { simpleFaker } from "@faker-js/faker/.";
import {
  DatabaseSetup,
  disconnectClient,
  setupDatabase,
  teardownPool,
} from "~/test-db-setup";

describe("Billing", () => {
  let billingDetails: TestBilling;
  let database: DatabaseSetup;
  const nonExistentId = simpleFaker.string.uuid();
  beforeEach(async () => {
    database = await setupDatabase();
    billingDetails = await createTestBilling();
  });

  afterEach(() => {
    disconnectClient(database.client);
  });

  afterAll(async () => {
    teardownPool(database.pool);
  });

  describe("deleteBilling", () => {
    it("should delete billing", async () => {
      const { session } = billingDetails;
      const { client } = database;
      await deleteBilling(session.id, client);
      const cnt = await db.billing.count({
        where: {
          sessionId: session.id,
        },
      });
      expect(cnt).toBe(0);
    });

    it("should not throw error if sessionId is not valid", async () => {
      const { client } = database;
      await expect(deleteBilling(nonExistentId, client)).resolves.not.toThrow();
    });
  });
});
