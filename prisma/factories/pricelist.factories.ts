import db from "@db/test-db";
import {
  generateImportedInventoryItemData,
  generateImportedProductData,
  generateImportedVariantData,
  generateInventoryItemData,
  generatePriceListData,
  generateProductData,
  generateVariantData,
} from "@db/fixtures";
import {
  PRICE_LIST_PRICING_STRATEGY,
  type PriceListPricingStrategyOptions,
} from "@db/constants";
import { createTestSession } from "./session.factories";
import type {
  ImportedInventoryItem,
  ImportedProduct,
  ImportedVariant,
  InventoryItem,
  PriceList,
  Product,
  Session,
  Variant,
  Prisma,
  PrismaClient,
} from "@prisma/client";
type DbClient = PrismaClient | Prisma.TransactionClient;

export type TestGeneralPriceList = {
  supplier: Session;
  retailer: Session;
  priceList: PriceList;
  product: Product;
  variant: Variant;
  inventoryItem: InventoryItem;
  importedProduct: ImportedProduct;
  importedVariant: ImportedVariant;
  importedInventoryItem: ImportedInventoryItem;
};

// Contains price list and relevant fields (product, imported product, etc)
export const generatePriceList = async (
  supplierId: string,
  isGeneral: boolean,
  pricingStrategy: PriceListPricingStrategyOptions,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generatePriceListData({
    supplierId,
    isGeneral,
    pricingStrategy,
  });
  return await ctx.priceList.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateProduct = async (
  priceListId: string,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generateProductData(priceListId);
  return await ctx.product.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateVariant = async (
  dbProductId: string,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generateVariantData(dbProductId);
  return await ctx.variant.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateImportedVariant = async (
  dbVariantId: string,
  dbImportedProductId: string,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generateImportedVariantData(dbVariantId, dbImportedProductId);
  return await ctx.importedVariant.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateImportedProduct = async (
  dbProductId: string,
  retailerId: string,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generateImportedProductData(dbProductId, retailerId);
  return await ctx.importedProduct.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateInventoryItem = async (
  dbVariantId: string,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generateInventoryItemData(dbVariantId);
  return await ctx.inventoryItem.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateImportedInventoryItem = async (
  dbInventoryItemId: string,
  dbImportedVariantId: string,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generateImportedInventoryItemData(
    dbInventoryItemId,
    dbImportedVariantId
  );
  return await ctx.importedInventoryItem.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const createTestGeneralPriceListWithProducts =
  async (): Promise<TestGeneralPriceList> => {
    const supplier = await createTestSession();
    const retailer = await createTestSession();
    const priceList = await generatePriceList(
      supplier.id,
      true,
      PRICE_LIST_PRICING_STRATEGY.MARGIN
    );
    const product = await generateProduct(priceList.id);
    const variant = await generateVariant(product.id);
    const inventoryItem = await generateInventoryItem(variant.id);
    const importedProduct = await generateImportedProduct(
      product.id,
      retailer.id
    );
    const importedVariant = await generateImportedVariant(
      variant.id,
      importedProduct.id
    );
    const importedInventoryItem = await generateImportedInventoryItem(
      inventoryItem.id,
      importedVariant.id
    );

    return {
      supplier,
      priceList,
      product,
      variant,
      inventoryItem,
      importedProduct,
      importedVariant,
      importedInventoryItem,
      retailer,
    };
  };
