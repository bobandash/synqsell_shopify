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

  describe("getAllImportedVariants", () => {
    it("should return imported variant for retailer", async () => {
      const { importedVariant, variant, retailer, supplier } = priceListDetails;
      const { client } = database;
      const res = await getAllImportedVariants(retailer.id, client);
      expect(res).toHaveLength(1);
      expect(res).toEqual([
        {
          retailerShopifyVariantId: importedVariant.shopifyVariantId,
          supplierShopifyVariantId: variant.shopifyVariantId,
          supplierId: supplier.id,
        },
      ]);
    });

    it("should return multiple imported variants for retailer", async () => {
      const { importedVariant, variant, retailer, supplier, priceList } =
        priceListDetails;
      const { client } = database;
      const newProduct = await generateProduct(priceList.id);
      const newVariant = await generateVariant(newProduct.id);
      const newImportedProduct = await generateImportedProduct(
        newProduct.id,
        retailer.id
      );
      const newImportedVariant = await generateImportedVariant(
        newVariant.id,
        newImportedProduct.id
      );

      const res = await getAllImportedVariants(retailer.id, client);
      expect(res).toHaveLength(2);
      expect(res).toEqual([
        {
          retailerShopifyVariantId: importedVariant.shopifyVariantId,
          supplierShopifyVariantId: variant.shopifyVariantId,
          supplierId: supplier.id,
        },
        {
          retailerShopifyVariantId: newImportedVariant.shopifyVariantId,
          supplierShopifyVariantId: newVariant.shopifyVariantId,
          supplierId: supplier.id,
        },
      ]);
    });

    it("should return empty array if retailerId is invalid", async () => {
      const { client } = database;
      const res = await getAllImportedVariants(nonExistentId, client);
      expect(res).toHaveLength(0);
    });
  });
});
