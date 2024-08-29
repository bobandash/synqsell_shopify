import db from '~/db.server';
import type { GraphQL } from '~/types';
import {
  updatePriceListSettingsTx,
  type CreatePriceListDataProps,
} from '../models/priceList';
import { priceListDataSchema } from '../models/priceList/schemas';
import { errorHandler } from '../util';
import {
  addPriceListRetailersTx,
  removePriceListRetailersTx,
} from '../models/priceListRetailer';
import {
  addProductsTx,
  deleteProductsTx,
  getMapShopifyProductIdToPrismaIdTx,
} from '../models/product';
import type { Prisma } from '@prisma/client';
import type { CoreProductProps } from '../types';
import {
  deleteVariantsTx,
  getShopifyVariantIdsInPriceListTx,
  updateVariantsTx,
} from '../models/variants';
import { addVariantsTx } from '../helper/variants';

// gets retailers to add and remove from price list
async function getRetailerStatus(priceListId: string, newRetailers: string[]) {
  try {
    const retailerIdsInPriceList = (
      await db.priceListRetailer.findMany({
        where: {
          priceListId,
        },
      })
    ).map(({ retailerId }) => retailerId);
    const retailerIdsInPriceListSet = new Set(retailerIdsInPriceList);
    const retailerIdsSet = new Set(newRetailers);

    const retailersToRemove = retailerIdsInPriceList.filter(
      (id) => !retailerIdsSet.has(id),
    );
    const retailersToAdd = newRetailers.filter(
      (id) => !retailerIdsInPriceListSet.has(id),
    );
    return { retailersToRemove, retailersToAdd };
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get retailers that will be removed and added in price list.',
      getRetailerStatus,
      {
        priceListId,
        newRetailers,
      },
    );
  }
}

// gets products to add and remove from price list
async function getProductStatus(priceListId: string, productIds: string[]) {
  try {
    const originalProducts = (
      await db.product.findMany({
        where: {
          priceListId,
        },
        select: {
          id: true,
        },
      })
    ).map(({ id }) => id);
    const originalProductsSet = new Set(originalProducts);
    const newProductsSet = new Set(productIds);

    const productsToAdd = productIds.filter(
      (id) => !originalProductsSet.has(id),
    );
    const productsToRemove = originalProducts.filter(
      (id) => !newProductsSet.has(id),
    );
    return { productsToAdd, productsToRemove };
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get product statuses of products that will be removed and added from price list.',
      getProductStatus,
      {
        priceListId,
        productIds,
      },
    );
  }
}

// returns the data of the variants to add, remove, and update
// the problem with variants is that when a product is deleted, it should cascade delete the variants as well
// so that's why you have to use the transaction instead and call this when products are already deleted
// TODO: refactor this function later
async function getVariantStatusTx(
  tx: Prisma.TransactionClient,
  priceListId: string,
  products: CoreProductProps[],
) {
  try {
    const productIds = products.map(({ id }) => id);
    const shopifyProductIdToPrismaId = await getMapShopifyProductIdToPrismaIdTx(
      tx,
      productIds,
      priceListId,
    );
    const variantsWithPrismaProductId = products.flatMap((product) =>
      product.variants.map((variant) => ({
        variantId: variant.id,
        wholesalePrice: variant.wholesalePrice,
        prismaProductId: shopifyProductIdToPrismaId.get(product.id) ?? '',
      })),
    );
    // TODO: add error handling for if productId is nothing
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
        product.variants.map((variant) => variant.id),
      ),
    );

    // variantsToRemove has to be an array of ids in the database
    const prismaIdsToRemoveInVariant = idsInOldPriceList
      .filter((ids) => !variantIdsInNewPriceListSet.has(ids.shopifyVariantId))
      .map(({ id }) => id);
    const variantsToAdd = variantsWithPrismaProductId.filter(
      ({ variantId: id }) => !shopifyVariantIdsInOldPriceListSet.has(id),
    );
    const variantsToUpdate = variantsWithPrismaProductId.filter(
      ({ variantId: id }) => shopifyVariantIdsInOldPriceListSet.has(id),
    );
    const variantsToUpdateWithPrismaId = variantsToUpdate.map((item) => {
      return {
        ...item,
        prismaId:
          variantIdToPrismaIdInOldPriceListMap.get(item.variantId) ?? '',
      };
    });

    return {
      variantsToUpdate: variantsToUpdateWithPrismaId,
      variantsToAdd,
      prismaIdsToRemoveInVariant,
    };
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get product statuses of variants that will be removed, updated, and added to price list.',
      getProductStatus,
      {
        priceListId,
        products,
      },
    );
  }

  // for variants to update, it's only if we must update wholesale price
}

export async function updateAllPriceListInformation(
  priceListId: string,
  data: CreatePriceListDataProps,
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    await priceListDataSchema.validate(data, {
      context: data,
    });
    const { settings, products, retailers } = data;
    const productIds = products.map((product) => product.id);
    const { retailersToAdd, retailersToRemove } = await getRetailerStatus(
      priceListId,
      retailers,
    );
    const { productsToAdd, productsToRemove } = await getProductStatus(
      priceListId,
      productIds,
    );

    await db.$transaction(async (tx) => {
      // variants can only be created after all the products are created because they depend on the product db's id
      await Promise.all([
        addProductsTx(tx, sessionId, priceListId, productsToAdd, graphql),
        deleteProductsTx(tx, priceListId, productsToRemove),
      ]);
      const { variantsToAdd, prismaIdsToRemoveInVariant, variantsToUpdate } =
        await getVariantStatusTx(tx, priceListId, products);

      await Promise.all([
        deleteVariantsTx(tx, prismaIdsToRemoveInVariant),
        updateVariantsTx(tx, variantsToUpdate),
        addVariantsTx(tx, variantsToAdd, sessionId, graphql),
        updatePriceListSettingsTx(tx, sessionId, priceListId, settings),
        removePriceListRetailersTx(tx, priceListId, retailersToRemove),
        addPriceListRetailersTx(tx, priceListId, retailersToAdd),
      ]);
    });
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to update price list.',
      updateAllPriceListInformation,
      {
        sessionId,
      },
    );
  }
}
