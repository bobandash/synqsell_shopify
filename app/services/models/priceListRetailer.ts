import type { Prisma } from '@prisma/client';
import { errorHandler } from '../util';
import db from '~/db.server';

// schema to verify if inputs are valid
export async function getPriceListRetailerIds(priceListId: string) {
  try {
    const retailers = await db.priceListRetailer.findMany({
      where: {
        priceListId,
      },
      select: {
        retailerId: true,
      },
    });

    const retailerIds = retailers.map(({ retailerId }) => retailerId);
    return retailerIds;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get price list retailer ids.',
      getPriceListRetailerIds,
      { priceListId },
    );
  }
}

export async function isRetailerInPriceList(
  retailerId: string,
  priceListId: string,
) {
  try {
    const retailer = await db.priceListRetailer.findFirst({
      where: {
        retailerId,
        priceListId,
      },
    });
    if (!retailer) {
      return false;
    }
    return true;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to see if retailer is in price list.',
      isRetailerInPriceList,
      { retailerId, priceListId },
    );
  }
}

export async function addPriceListRetailersTx(
  tx: Prisma.TransactionClient,
  priceListId: string,
  retailerIds: string[],
) {
  try {
    const data = retailerIds.map((retailerId) => {
      return {
        priceListId,
        retailerId,
      };
    });
    const newRetailers = await tx.priceListRetailer.createManyAndReturn({
      data,
    });
    return newRetailers;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to add retailers to price list in transaction.',
      addPriceListRetailersTx,
      { priceListId, retailerIds },
    );
  }
}

export async function removePriceListRetailersTx(
  tx: Prisma.TransactionClient,
  priceListId: string,
  retailerIds: string[],
) {
  try {
    const deletedRetailerPriceLists = await tx.priceListRetailer.deleteMany({
      where: {
        retailerId: {
          in: retailerIds,
        },
        priceListId: priceListId,
      },
    });

    return deletedRetailerPriceLists;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to delete retailers from price list in transaction.',
      addPriceListRetailersTx,
      { priceListId, retailerIds },
    );
  }
}
