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
import { addProductsTx, deleteProductsTx } from '../models/product';

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
      await Promise.all([
        updatePriceListSettingsTx(tx, sessionId, priceListId, settings),
        removePriceListRetailersTx(tx, priceListId, retailersToRemove),
        addPriceListRetailersTx(tx, priceListId, retailersToAdd),
        deleteProductsTx(tx, priceListId, productsToRemove),
        addProductsTx(tx, sessionId, priceListId, productsToAdd, graphql),
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
