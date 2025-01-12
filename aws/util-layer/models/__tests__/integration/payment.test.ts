import {
  createTestOrderWithEntireFlow,
  TestOrderEntireFlow,
} from "@db/factories/order.factories";
import { simpleFaker } from "@faker-js/faker/.";
import {
  DatabaseSetup,
  disconnectClient,
  setupDatabase,
  teardownPool,
} from "~/test-db-setup";
import { hasPaymentFromFulfillmentId } from "../../payment";

describe("Payment", () => {
  let orderEntireFlowDetails: TestOrderEntireFlow;
  let database: DatabaseSetup;
  const nonExistentId = simpleFaker.string.uuid();
  beforeEach(async () => {
    database = await setupDatabase();
    orderEntireFlowDetails = await createTestOrderWithEntireFlow();
  });

  afterEach(() => {
    disconnectClient(database.client);
  });

  afterAll(async () => {
    teardownPool(database.pool);
  });

  describe("hasPaymentFromFulfillmentId", () => {
    it("should return true if payment exists for fulfillment id", async () => {
      const { payment } = orderEntireFlowDetails;
      const { client } = database;
      const res = await hasPaymentFromFulfillmentId(
        payment.fulfillmentId,
        client
      );
      expect(res).toBe(true);
    });

    it("should return false if nonExistentId is passed", async () => {
      const { client } = database;
      const res = await hasPaymentFromFulfillmentId(nonExistentId, client);
      expect(res).toBe(false);
    });
  });
});
