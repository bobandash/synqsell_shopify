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
} from "./setup/db-setup";
import { getOrderFromSupplierShopifyOrderId, isOrder } from "../../order";

describe("Order", () => {
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

  describe("isOrder", () => {
    it("should return true if supplierShopifyOrderId is valid order", async () => {
      const { client } = database;
      const { supplier, order } = orderEntireFlowDetails;
      const res = await isOrder(
        order.supplierShopifyOrderId,
        supplier.id,
        client
      );
      expect(res).toBe(true);
    });
    it("should return false if supplierShopifyOrderId is invalid order", async () => {
      const { client } = database;
      const { supplier, order } = orderEntireFlowDetails;
      const res = await isOrder(nonExistentId, supplier.id, client);
      expect(res).toBe(false);
    });

    it("should return false if supplierId is invalid", async () => {
      const { client } = database;
      const { order } = orderEntireFlowDetails;
      const res = await isOrder(order.id, nonExistentId, client);
      expect(res).toBe(false);
    });
  });

  describe("getOrderFromSupplierShopifyOrderId", () => {
    it("should return order if supplierShopifyOrderId is valid order", async () => {
      const { client } = database;
      const { order } = orderEntireFlowDetails;
      const res = await getOrderFromSupplierShopifyOrderId(
        order.supplierShopifyOrderId,
        client
      );
      expect(res).toMatchObject({
        ...order,
        shippingCost: order.shippingCost.toFixed(2),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it("should throw error if invalid order", async () => {
      const { client } = database;
      await expect(
        getOrderFromSupplierShopifyOrderId(nonExistentId, client)
      ).rejects.toThrow("No order exists.");
    });
  });
});
