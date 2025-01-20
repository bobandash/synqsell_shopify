import {
  createTestGeneralPriceListWithProducts,
  generateProduct,
} from '@db/factories/pricelist.factories';
import { simpleFaker } from '@faker-js/faker';
import type { PriceList, Product } from '@prisma/client';
import db from '~/db.server';
import {
  addProducts,
  deleteProducts,
  getAllProductDetails,
  getProductWithVariantsFromPriceList,
  hasProduct,
} from '../../product.server';

describe('Product', () => {
  let product: Product;
  let priceList: PriceList;
  const nonexistentId = simpleFaker.string.uuid();

  beforeEach(async () => {
    const res = await createTestGeneralPriceListWithProducts();
    product = res.product;
    priceList = res.priceList;
  });

  describe('hasProduct', () => {
    it('should return true if product exists', async () => {
      const exists = await hasProduct(product.id);
      expect(exists).toBe(true);
    });

    it('should return false if product does not exists', async () => {
      const exists = await hasProduct(nonexistentId);
      expect(exists).toBe(false);
    });
  });

  describe('deleteProductsTx', () => {
    it('should delete one product successfully', async () => {
      await deleteProducts(priceList.id, [product.id]);
      const numProducts = await db.product.count({});
      expect(numProducts).toBe(0);
    });

    it('should delete multiple products successfully', async () => {
      const newProduct = await generateProduct(priceList.id);
      const numProductsBefore = await db.product.count({});
      await deleteProducts(priceList.id, [product.id, newProduct.id]);
      const numProducts = await db.product.count({});
      expect(numProductsBefore).toBe(2);
      expect(numProducts).toBe(0);
    });

    it('should not delete product if nonexistent id was passed', async () => {
      const numProductsBefore = await db.product.count({});
      await deleteProducts(priceList.id, [nonexistentId]);
      const numProducts = await db.product.count({});
      expect(numProductsBefore).toBe(numProducts);
    });
  });

  describe('addProductsTx', () => {
    it('should add shopify products to price list', async () => {
      const idOne = simpleFaker.string.uuid();
      const idTwo = simpleFaker.string.uuid();
      await addProducts(priceList.id, [idOne, idTwo]);
      const areProductsAdded =
        (await db.product.count({
          where: {
            shopifyProductId: {
              in: [idOne, idTwo],
            },
          },
        })) === 2;
      expect(areProductsAdded).toBe(true);
    });

    it('should fail to add product already in price list', async () => {
      await expect(
        await addProducts(priceList.id, [product.shopifyProductId]),
      ).rejects.toThrow();
    });
  });

  describe('getProductWithVariantsFromPriceList', () => {
    it('should return product in price list with variant and inventory items', async () => {
      const products = await getProductWithVariantsFromPriceList(priceList.id);
      expect(products).toHaveLength(1);
      expect(products[0].id).toBe(product.id);
      expect(products[0].variants).toHaveLength(1);
      expect(products[0].variants[0].inventoryItem).toBeDefined();
    });

    it('should return empty if price list does not exist', async () => {
      const products = await getProductWithVariantsFromPriceList(nonexistentId);
      expect(products).toHaveLength(0);
    });
  });

  describe('getAllProductDetails', () => {
    it('should return variant details and price list the product is in', async () => {
      const res = await getAllProductDetails(product.id);
      expect(res.variants).toHaveLength(1);
      expect(res.variants[0].inventoryItem).not.toBe(null);
      expect(res.priceList).not.toBe(null);
    });

    it('should throw error if product does not exist', async () => {
      await expect(getAllProductDetails(nonexistentId)).rejects.toThrow();
    });
  });
});
