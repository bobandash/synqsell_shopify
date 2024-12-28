import { createTestGeneralPriceListWithProducts } from '@factories/pricelist.factories';
import { simpleFaker } from '@faker-js/faker';
import type { ImportedProduct } from '@prisma/client';
import { isImportedProduct } from '../../importedProduct.server';

describe('Imported Product', () => {
  let importedProduct: ImportedProduct;
  const nonexistentId = simpleFaker.string.uuid();

  beforeEach(async () => {
    const res = await createTestGeneralPriceListWithProducts();
    importedProduct = res.importedProduct;
  });

  describe('isImportedProduct', () => {
    it('should return false when not imported product', async () => {
      const res = await isImportedProduct(nonexistentId);
      expect(res).toBe(false);
    });

    it('should return true if is imported product', async () => {
      const res = await isImportedProduct(importedProduct.shopifyProductId);
      expect(res).toBe(true);
    });
  });
});
