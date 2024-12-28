import db from '~/db.server';
import {
  generateImportedInventoryItemData,
  generateImportedProductData,
  generateImportedVariantData,
  generateInventoryItemData,
  generatePriceListData,
  generateProductData,
  generateVariantData,
} from '@fixtures';
import {
  PRICE_LIST_PRICING_STRATEGY,
  type PriceListPricingStrategyOptions,
} from '~/constants';
import { createTestSession } from './session.factories';

// Contains price list and relevant fields (product, imported product, etc)
export const generatePriceList = (
  supplierId: string,
  isGeneral: boolean,
  pricingStrategy: PriceListPricingStrategyOptions,
  overrides = {},
) => {
  const data = generatePriceListData({
    supplierId,
    isGeneral,
    pricingStrategy,
  });
  return db.priceList.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateProduct = (priceListId: string, overrides = {}) => {
  const data = generateProductData(priceListId);
  return db.product.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateVariant = (dbProductId: string, overrides = {}) => {
  const data = generateVariantData(dbProductId);
  return db.variant.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateImportedVariant = (
  dbVariantId: string,
  dbImportedProductId: string,
  overrides = {},
) => {
  const data = generateImportedVariantData(dbVariantId, dbImportedProductId);
  return db.importedVariant.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateImportedProduct = (
  dbProductId: string,
  retailerId: string,
  overrides = {},
) => {
  const data = generateImportedProductData(dbProductId, retailerId);
  return db.importedProduct.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateInventoryItem = (dbVariantId: string, overrides = {}) => {
  const data = generateInventoryItemData(dbVariantId);
  return db.inventoryItem.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateImportedInventoryItem = (
  dbInventoryItemId: string,
  dbImportedVariantId: string,
  overrides = {},
) => {
  const data = generateImportedInventoryItemData(
    dbInventoryItemId,
    dbImportedVariantId,
  );
  return db.importedInventoryItem.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const createTestGeneralPriceListWithProducts = async () => {
  const session = await createTestSession();
  const priceList = await generatePriceList(
    session.id,
    true,
    PRICE_LIST_PRICING_STRATEGY.MARGIN,
  );
  const product = await generateProduct(priceList.id);
  const variant = await generateVariant(product.id);
  const inventoryItem = await generateInventoryItem(variant.id);
  const importedProduct = await generateImportedProduct(product.id, session.id);
  const importedVariant = await generateImportedVariant(
    variant.id,
    importedProduct.id,
  );
  const importedInventoryItem = await generateImportedInventoryItem(
    inventoryItem.id,
    importedVariant.id,
  );

  return {
    session,
    priceList,
    product,
    variant,
    inventoryItem,
    importedProduct,
    importedVariant,
    importedInventoryItem,
  };
};
