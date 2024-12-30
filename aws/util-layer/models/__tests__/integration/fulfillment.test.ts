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
import db from "@db/test-db";
import {
  deleteFulfillment,
  getFulfillment,
  getFulfillmentIdFromRetailerShopify,
  getFulfillmentIdFromSupplierShopify,
} from "../../fulfillment";

describe("importedProduct", () => {
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

  describe("getFulfillment", () => {
    it("should return fulfillment if proper id was provided", async () => {
      const { fulfillment } = orderEntireFlowDetails;
      const { client } = database;
      const res = await getFulfillment(fulfillment.id, client);
      expect(res).toMatchObject({ ...fulfillment });
    });

    it("should throw error if id is nonexistent", async () => {
      const { client } = database;
      await expect(getFulfillment(nonExistentId, client)).rejects.toThrow(
        "No fulfillment exists."
      );
    });
  });

  describe("deleteFulfillment", () => {
    it("should successfully delete fulfillment if valid", async () => {
      const { fulfillment } = orderEntireFlowDetails;
      const { client } = database;
      const oldCnt = await db.fulfillment.count({
        where: {
          id: fulfillment.id,
        },
      });

      await deleteFulfillment(fulfillment.id, client);
      const newCnt = await db.fulfillment.count({
        where: {
          id: fulfillment.id,
        },
      });
      expect(oldCnt).toBe(1);
      expect(newCnt).toBe(0);
    });

    it("should not throw error if fulfillment id is invalid", async () => {
      const { client } = database;
      await deleteFulfillment(nonExistentId, client);
    });
  });

  describe("getFulfillmentIdFromSupplierShopify", () => {
    it("should return fulfillment id if proper id was provided", async () => {
      const { fulfillment } = orderEntireFlowDetails;
      const { client } = database;
      const res = await getFulfillmentIdFromSupplierShopify(
        fulfillment.supplierShopifyFulfillmentId,
        client
      );
      expect(res).toBe(fulfillment.id);
    });

    it("should throw error if id is nonexistent", async () => {
      const { client } = database;
      await expect(
        getFulfillmentIdFromSupplierShopify(nonExistentId, client)
      ).rejects.toThrow("No fulfillment exists.");
    });
  });

  describe("getFulfillmentIdFromRetailerShopify", () => {
    it("should return fulfillment if proper id was provided", async () => {
      const { fulfillment } = orderEntireFlowDetails;
      const { client } = database;
      const res = await getFulfillmentIdFromRetailerShopify(
        fulfillment.retailerShopifyFulfillmentId,
        client
      );
      expect(res).toBe(fulfillment.id);
    });

    it("should throw error if id is nonexistent", async () => {
      const { client } = database;
      await expect(
        getFulfillmentIdFromRetailerShopify(nonExistentId, client)
      ).rejects.toThrow("No fulfillment exists.");
    });
  });
});
