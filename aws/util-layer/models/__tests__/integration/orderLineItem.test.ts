import {
  createTestOrderWithEntireFlow,
  generateOrderLineItem,
  TestOrderEntireFlow,
} from "@db/factories/order.factories";
import { simpleFaker } from "@faker-js/faker/.";
import {
  DatabaseSetup,
  disconnectClient,
  setupDatabase,
  teardownPool,
} from "~/test-db-setup";
import { getOrderLineItems } from "../../orderLineItem";

describe("OrderLineItem", () => {
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

  describe("OrderLineItem", () => {
    it("should return the order line item", async () => {
      const { orderLineItem } = orderEntireFlowDetails;
      const { client } = database;
      const res = await getOrderLineItems(orderLineItem.orderId, client);
      const orderLineItemObj = {
        ...orderLineItem,
        retailPricePerUnit: orderLineItem.retailPricePerUnit.toFixed(2),
        retailerProfitPerUnit: orderLineItem.retailerProfitPerUnit.toFixed(2),
        supplierProfitPerUnit: orderLineItem.supplierProfitPerUnit.toFixed(2),
      };
      expect(res).toHaveLength(1);
      expect(res).toEqual([expect.objectContaining({ ...orderLineItemObj })]);
    });

    it("should return multiple order line items", async () => {
      const { orderLineItem, order, priceList } = orderEntireFlowDetails;
      const { client } = database;
      const newOrderLineItem = await generateOrderLineItem(
        order.id,
        priceList.id
      );
      const res = await getOrderLineItems(orderLineItem.orderId, client);
      const orderLineItemObjOne = {
        ...orderLineItem,
        retailPricePerUnit: orderLineItem.retailPricePerUnit.toFixed(2),
        retailerProfitPerUnit: orderLineItem.retailerProfitPerUnit.toFixed(2),
        supplierProfitPerUnit: orderLineItem.supplierProfitPerUnit.toFixed(2),
      };
      const orderLineItemObjTwo = {
        ...newOrderLineItem,
        retailPricePerUnit: newOrderLineItem.retailPricePerUnit.toFixed(2),
        retailerProfitPerUnit:
          newOrderLineItem.retailerProfitPerUnit.toFixed(2),
        supplierProfitPerUnit:
          newOrderLineItem.supplierProfitPerUnit.toFixed(2),
      };

      expect(res).toHaveLength(2);
      expect(res).toEqual([
        expect.objectContaining({ ...orderLineItemObjOne }),
        expect.objectContaining({ ...orderLineItemObjTwo }),
      ]);
    });

    it("should throw error if no order line items were found", async () => {
      const { client } = database;
      await expect(getOrderLineItems(nonExistentId, client)).rejects.toThrow(
        "No order line items exists."
      );
    });
  });
});
