import type { Prisma } from '@prisma/client';
import { errorHandler } from '../util';

// schema to verify if inputs are valid

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
