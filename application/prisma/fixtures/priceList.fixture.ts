import { simpleFaker } from '@faker-js/faker';
import type { PriceListPricingStrategyOptions } from '~/constants';

// This file contains all sample data necessary for price list, including but not limited to
// product, variant, inventoryItem
// importedProduct, importedVariant, importedInventoryItem
export const samplePriceList = (
  supplierId: string,
  isGeneral: boolean,
  pricingStrategy: PriceListPricingStrategyOptions,
) => ({
  id: simpleFaker.string.uuid(),
  createdAt: simpleFaker.date.recent(),
  pricingStrategy,
  supplierId,
  isGeneral,
  name: simpleFaker.string.alpha(5),
  requiresApprovalToImport: false,
  margin: 10,
});

export const sampleProduct = (priceListId: string) => ({
  id: simpleFaker.string.uuid(),
  priceListId,
  shopifyProductId: simpleFaker.string.alpha(10),
  createdAt: simpleFaker.date.recent(),
});

export const sampleVariant = (dbProductId: string) => ({
  id: simpleFaker.string.uuid(),
  productId: dbProductId,
  shopifyVariantId: simpleFaker.string.alpha(10),
  retailPrice: simpleFaker.string.numeric(2),
  retailerPayment: simpleFaker.string.numeric(2),
  supplierProfit: simpleFaker.string.numeric(2),
});

export const sampleInventoryItem = (dbVariantId: string) => ({
  id: simpleFaker.string.uuid(),
  variantId: dbVariantId,
  shopifyInventoryItemId: simpleFaker.string.alpha(10),
});

export const sampleImportedVariant = (dbVariantId: string) => ({
  id: simpleFaker.string.uuid(),
  importedProductId: simpleFaker.string.alpha(10),
  prismaVariantId: dbVariantId,
  shopifyVariantId: simpleFaker.string.alpha(10),
});

export const sampleImportedInventoryItem = (
  dbInventoryItemId: string,
  dbImportedVariantId: string,
) => ({
  id: simpleFaker.string.uuid(),
  shopifyInventoryItemId: simpleFaker.string.alpha(10),
  importedVariantId: dbImportedVariantId,
  prismaInventoryItemId: dbInventoryItemId,
});
