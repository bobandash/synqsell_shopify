import {
  createTestGeneralPriceListWithProducts,
  generateImportedProduct,
  generateProduct,
  TestGeneralPriceList,
} from "@db/factories/pricelist.factories";
import { simpleFaker } from "@faker-js/faker/.";
import {
  DatabaseSetup,
  disconnectClient,
  setupDatabase,
  teardownPool,
} from "~/test-db-setup";
import db from "@db/test-db";
import {
  deleteAllImportedProducts,
  deleteImportedProduct,
  isImportedProduct,
} from "../../importedProduct";

describe("importedProduct", () => {
  let priceListDetails: TestGeneralPriceList;
  let database: DatabaseSetup;
  const nonExistentId = simpleFaker.string.uuid();

  beforeEach(async () => {
    database = await setupDatabase();
    priceListDetails = await createTestGeneralPriceListWithProducts();
  });

  afterEach(() => {
    disconnectClient(database.client);
  });

  afterAll(async () => {
    teardownPool(database.pool);
  });

  describe("isImportedProduct", () => {
    it("should return true if shopifyProductId is an imported product", async () => {
      const { importedProduct } = priceListDetails;
      const { client } = database;
      const res = await isImportedProduct(
        importedProduct.shopifyProductId,
        client
      );
      expect(res).toBe(true);
    });

    it("should return false if shopifyProductId is not an imported product", async () => {
      const { client } = database;
      const res = await isImportedProduct(nonExistentId, client);
      expect(res).toBe(false);
    });
  });

  describe("deleteImportedProduct", () => {
    it("should delete imported product given shopifyProductId", async () => {
      const { importedProduct } = priceListDetails;
      const { client } = database;
      const prevCnt = await db.importedProduct.count({
        where: {
          shopifyProductId: importedProduct.shopifyProductId,
        },
      });
      await deleteImportedProduct(importedProduct.shopifyProductId, client);
      const newCnt = await db.importedProduct.count({
        where: {
          shopifyProductId: importedProduct.shopifyProductId,
        },
      });
      expect(prevCnt).toBe(1);
      expect(newCnt).toBe(0);
    });

    it("should not throw error if pass nonexistent id", async () => {
      const { client } = database;
      await deleteImportedProduct(nonExistentId, client);
    });
  });

  describe("deleteAllImportedProducts", () => {
    it("should delete all imported products for retailer", async () => {
      const { importedProduct, priceList, retailer } = priceListDetails;
      const { client } = database;
      const newProductOne = await generateProduct(priceList.id);
      const newProductTwo = await generateProduct(priceList.id);
      await generateImportedProduct(newProductOne.id, retailer.id);
      await generateImportedProduct(newProductTwo.id, retailer.id);

      const prevCnt = await db.importedProduct.count({
        where: {
          retailerId: retailer.id,
        },
      });
      await deleteAllImportedProducts(retailer.id, client);
      const newCnt = await db.importedProduct.count({
        where: {
          shopifyProductId: importedProduct.shopifyProductId,
        },
      });
      expect(prevCnt).toBe(3);
      expect(newCnt).toBe(0);
    });

    it("should not throw error if pass nonexistent id", async () => {
      const { client } = database;
      await deleteAllImportedProducts(nonExistentId, client);
    });
  });
});
