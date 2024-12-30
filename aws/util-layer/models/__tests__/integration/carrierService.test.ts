import {
  createTestCarrierService,
  TestCarrierService,
} from "@db/factories/carrierService.factories";
import { getShopifyCarrierServiceId } from "../../carrierService";
import { simpleFaker } from "@faker-js/faker/.";
import {
  DatabaseSetup,
  disconnectClient,
  setupDatabase,
  teardownPool,
} from "./setup/db-setup";

describe("Billing", () => {
  let carrierServiceDetails: TestCarrierService;
  let database: DatabaseSetup;
  const nonExistentId = simpleFaker.string.uuid();
  beforeEach(async () => {
    database = await setupDatabase();
    carrierServiceDetails = await createTestCarrierService();
  });

  afterEach(() => {
    disconnectClient(database.client);
  });

  afterAll(async () => {
    teardownPool(database.pool);
  });

  describe("getShopifyCarrierServiceId", () => {
    it("should return shopify carrier service id", async () => {
      const { retailer, carrierService } = carrierServiceDetails;
      const { client } = database;
      const res = await getShopifyCarrierServiceId(retailer.id, client);
      expect(res).toBe(carrierService.shopifyCarrierServiceId);
    });

    it("should throw error if retaukerUd is invalid", async () => {
      const { client } = database;
      await expect(
        getShopifyCarrierServiceId(nonExistentId, client)
      ).rejects.toThrow("No shopify carrier service exists.");
    });
  });
});
