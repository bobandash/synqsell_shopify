import {
  createTestGeneralPriceListWithProducts,
  generateImportedProduct,
  generateImportedVariant,
  generateProduct,
  generateVariant,
  TestGeneralPriceList,
} from "@db/factories/pricelist.factories";
import { simpleFaker } from "@faker-js/faker/.";
import {
  DatabaseSetup,
  disconnectClient,
  setupDatabase,
  teardownPool,
} from "~/test-db-setup";
import { getAllImportedVariants } from "../../importedVariant";
import { deleteProduct, isProduct } from "../../product";
import db from "@db/test-db";

describe("importedVariants", () => {
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

  describe("isProduct", () => {
    it("should return true if shopifyProductId is a product", async () => {
      const { product } = priceListDetails;
      const { client } = database;
      const res = await isProduct(product.shopifyProductId, client);
      expect(res).toBe(true);
    });

    it("should return false if shopifyProductId is not a product", async () => {
      const { client } = database;
      const res = await isProduct(nonExistentId, client);
      expect(res).toBe(false);
    });
  });

  describe("deleteProduct", () => {
    it("should successfully delete the product", async () => {
      const { product } = priceListDetails;
      const { client } = database;
      const numProductsBefore = await db.product.count({
        where: {
          shopifyProductId: product.shopifyProductId,
        },
      });
      await deleteProduct(product.shopifyProductId, client);
      const numProductsAfter = await db.product.count({
        where: {
          shopifyProductId: product.shopifyProductId,
        },
      });
      expect(numProductsBefore).toBe(1);
      expect(numProductsAfter).toBe(0);
    });

    it("should not throw error if not a product", async () => {
      const { client } = database;
      await deleteProduct(nonExistentId, client);
    });
  });
});
