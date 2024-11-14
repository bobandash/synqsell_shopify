import db from '~/db.server';
import {
  addProductsTx,
  deleteProductsTx,
} from '~/services/models/product.server';
import type { Prisma } from '@prisma/client';
import {
  addVariantsTx,
  deleteVariantsTx,
  getShopifyVariantIdsInPriceListTx,
  updateVariantsTx,
} from '~/services/models/variants.server';
import type {
  PriceListActionData,
  PriceListSettings,
  ProductCoreData,
} from '../types';
import {
  noPriceListGeneralModificationIfExists,
  priceListDataSchema,
} from './util/schemas';
import { updatePartnershipsInPriceListTx } from './util';
import { StatusCodes } from 'http-status-codes';
import { createJSONSuccess, getRouteError, logError } from '~/lib/utils/server';

// TODO: Refactor this entire file, the code is verbose
export async function updatePriceListSettings(
  sessionId: string,
  priceListId: string,
  settings: PriceListSettings,
) {
  const { margin, requiresApprovalToImport, name, isGeneral, pricingStrategy } =
    settings;
  const updatedPriceList = await db.priceList.update({
    where: {
      id: priceListId,
    },
    data: {
      name,
      isGeneral,
      ...(requiresApprovalToImport !== undefined && {
        requiresApprovalToImport,
      }),
      pricingStrategy,
      ...(margin !== undefined && {
        margin,
      }),
      supplierId: sessionId,
    },
  });
  return updatedPriceList;
}

export async function updatePriceListSettingsTx(
  tx: Prisma.TransactionClient,
  sessionId: string,
  priceListId: string,
  settings: PriceListSettings,
) {
  const { margin, requiresApprovalToImport, name, isGeneral, pricingStrategy } =
    settings;
  const updatedPriceList = await tx.priceList.update({
    where: {
      id: priceListId,
    },
    data: {
      name,
      isGeneral,
      ...(requiresApprovalToImport !== undefined && {
        requiresApprovalToImport,
      }),
      pricingStrategy,
      ...(margin !== undefined && {
        margin,
      }),
      supplierId: sessionId,
    },
  });

  return updatedPriceList;
}

// gets products to add and remove from price list
async function getProductStatus(
  priceListId: string,
  shopifyProductIds: string[],
) {
  const originalProducts = await db.product.findMany({
    where: {
      priceListId,
    },
    select: {
      id: true,
      shopifyProductId: true,
    },
  });
  const originalProductShopifyIds = originalProducts.map(
    ({ shopifyProductId }) => shopifyProductId,
  );
  const originalProductShopifyIdsSet = new Set(originalProductShopifyIds);
  const newProductsSet = new Set(shopifyProductIds);

  const shopifyProductIdsToAdd = shopifyProductIds.filter(
    (shopifyProductId) => !originalProductShopifyIdsSet.has(shopifyProductId),
  );
  const prismaProductIdsToRemove = originalProducts
    .filter(({ shopifyProductId }) => !newProductsSet.has(shopifyProductId))
    .map(({ id }) => id);
  return { shopifyProductIdsToAdd, prismaProductIdsToRemove };
}

export async function getMapShopifyProductIdToPrismaIdTx(
  tx: Prisma.TransactionClient,
  productIds: string[],
  priceListId: string,
) {
  const idAndProductIds = await tx.product.findMany({
    where: {
      shopifyProductId: {
        in: productIds,
      },
      priceListId,
    },
    select: {
      id: true,
      shopifyProductId: true,
    },
  });

  const shopifyProductIdToPrismaId = new Map<string, string>();
  idAndProductIds.forEach(({ id, shopifyProductId }) => {
    shopifyProductIdToPrismaId.set(shopifyProductId, id);
  });
  return shopifyProductIdToPrismaId;
}

// returns the data of the variants to add, remove, and update
// the problem with variants is that when a product is deleted, it should cascade delete the variants as well
// so that's why you have to use the transaction instead and call this when products are already deleted
// TODO: refactor this to be modularized
async function getVariantStatusTx(
  tx: Prisma.TransactionClient,
  priceListId: string,
  products: ProductCoreData[],
) {
  const shopifyProductIds = products.map(
    ({ shopifyProductId }) => shopifyProductId,
  );
  const shopifyProductIdToPrismaId = await getMapShopifyProductIdToPrismaIdTx(
    tx,
    shopifyProductIds,
    priceListId,
  );

  const variantsWithPrismaProductId = products.flatMap((product) =>
    product.variants.map((variant) => {
      const productId = shopifyProductIdToPrismaId.get(
        product.shopifyProductId,
      );
      if (!productId) {
        throw new Error(
          'Product must be created before any variants are created.',
        );
      }
      return {
        ...variant,
        productId,
      };
    }),
  );

  const idsInOldPriceList = await getShopifyVariantIdsInPriceListTx(
    tx,
    priceListId,
  );
  const variantIdToPrismaIdInOldPriceListMap = new Map<string, string>();
  idsInOldPriceList.forEach((item) => {
    variantIdToPrismaIdInOldPriceListMap.set(item.shopifyVariantId, item.id);
  });

  const shopifyVariantIdsInOldPriceList = idsInOldPriceList.map(
    ({ shopifyVariantId }) => shopifyVariantId,
  );
  const shopifyVariantIdsInOldPriceListSet = new Set(
    shopifyVariantIdsInOldPriceList,
  );
  const variantIdsInNewPriceListSet = new Set(
    products.flatMap((product) =>
      product.variants.map((variant) => variant.shopifyVariantId),
    ),
  );

  // variantsToRemove has to be an array of ids in the database
  const prismaIdsToRemoveInVariant = idsInOldPriceList
    .filter((ids) => !variantIdsInNewPriceListSet.has(ids.shopifyVariantId))
    .map(({ id }) => id);
  const variantsToAdd = variantsWithPrismaProductId.filter(
    ({ shopifyVariantId: id }) => !shopifyVariantIdsInOldPriceListSet.has(id),
  );
  const variantsToUpdate = variantsWithPrismaProductId.filter(
    ({ shopifyVariantId: id }) => shopifyVariantIdsInOldPriceListSet.has(id),
  );
  const variantsToUpdateWithPrismaId = variantsToUpdate.map(
    ({ inventoryItem, shopifyVariantId, ...rest }) => {
      return {
        ...rest,
        shopifyVariantId,
        id: variantIdToPrismaIdInOldPriceListMap.get(shopifyVariantId) ?? '',
      };
    },
  );

  return {
    variantsToUpdate: variantsToUpdateWithPrismaId,
    variantsToAdd,
    prismaIdsToRemoveInVariant,
  };
}

async function updateAllPriceListInformationAction(
  priceListId: string,
  data: PriceListActionData,
  sessionId: string,
) {
  try {
    await priceListDataSchema.validate(data);
    await noPriceListGeneralModificationIfExists.validate({
      isGeneral: data.settings.isGeneral,
      sessionId,
      priceListId,
    });
    const { settings, products, partnerships } = data;
    const shopifyProductIds = products.map(
      ({ shopifyProductId }) => shopifyProductId,
    );
    const { shopifyProductIdsToAdd, prismaProductIdsToRemove } =
      await getProductStatus(priceListId, shopifyProductIds);

    await db.$transaction(
      async (tx) => {
        await Promise.all([
          addProductsTx(tx, priceListId, shopifyProductIdsToAdd),
          deleteProductsTx(tx, priceListId, prismaProductIdsToRemove),
        ]);

        // variant status has to be inside the transaction because products have to be created before any variants are created
        const { variantsToAdd, prismaIdsToRemoveInVariant, variantsToUpdate } =
          await getVariantStatusTx(tx, priceListId, products);

        await Promise.all([
          deleteVariantsTx(tx, prismaIdsToRemoveInVariant),
          updateVariantsTx(tx, variantsToUpdate),
          addVariantsTx(tx, variantsToAdd),
          updatePriceListSettingsTx(tx, sessionId, priceListId, settings),
          updatePartnershipsInPriceListTx(tx, priceListId, partnerships),
        ]);
      },
      {
        maxWait: 20000, // TODO: refactor this transaction
        timeout: 100000,
      },
    );

    return createJSONSuccess(
      'Successfully updated price list.',
      StatusCodes.OK,
    );
  } catch (error) {
    logError(error, 'Action: Update price list information');
    return getRouteError('Failed to update price list.', error);
  }
}

export default updateAllPriceListInformationAction;
