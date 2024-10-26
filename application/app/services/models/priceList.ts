import db from '~/db.server';
import { errorHandler } from '~/lib/utils/server';

export async function isValidPriceList(priceListId: string) {
  try {
    const priceList = await db.priceList.findFirst({
      where: {
        id: priceListId,
      },
    });
    if (priceList) {
      return true;
    }
    return false;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to retrieve if price list exists.',
      isValidPriceList,
      { priceListId },
    );
  }
}

export async function getPriceList(priceListId: string) {
  try {
    const priceList = await db.priceList.findFirstOrThrow({
      where: {
        id: priceListId,
      },
    });
    return priceList;
  } catch (error) {
    throw errorHandler(error, 'Failed to retrieve price list.', getPriceList, {
      priceListId,
    });
  }
}

export async function hasGeneralPriceList(sessionId: string) {
  try {
    const generalPriceList = await db.priceList.findFirst({
      where: {
        isGeneral: true,
        supplierId: sessionId,
      },
    });
    if (!generalPriceList) {
      return false;
    }
    return true;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check whether general price list exists.',
      hasGeneralPriceList,
      { sessionId },
    );
  }
}

export async function getGeneralPriceList(sessionId: string) {
  try {
    const generalPriceList = await db.priceList.findFirstOrThrow({
      where: {
        isGeneral: true,
        supplierId: sessionId,
      },
    });
    return generalPriceList;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get general price list.',
      getGeneralPriceList,
      { sessionId },
    );
  }
}

export async function userHasPriceList(sessionId: string, priceListId: string) {
  try {
    const priceList = await db.priceList.findFirst({
      where: {
        supplierId: sessionId,
        id: priceListId,
      },
    });
    if (priceList) {
      return true;
    }
    return false;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if user has price list.',
      userHasPriceList,
      { sessionId },
    );
  }
}

export async function deletePriceListBatch(
  priceListsIds: string[],
  sessionId: string,
) {
  try {
    const deletedPriceLists = await db.priceList.deleteMany({
      where: {
        id: {
          in: priceListsIds,
        },
        supplierId: sessionId,
      },
    });
    return deletedPriceLists;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to delete price lists in batch.',
      deletePriceListBatch,
      { priceListsIds, sessionId },
    );
  }
}

export async function getAllPriceLists(supplierId: string) {
  try {
    // retrieves all price list ids the supplier has
    const priceLists = await db.priceList.findMany({
      where: {
        supplierId,
      },
    });
    return priceLists;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get all price lists.',
      getAllPriceLists,
      { supplierId },
    );
  }
}

export async function getRetailerIds(priceListId: string) {
  try {
    const priceListWithRetailers = await db.priceList.findFirstOrThrow({
      where: {
        id: priceListId,
      },
      include: {
        partnerships: {
          select: {
            retailerId: true,
          },
        },
      },
    });
    const { partnerships } = priceListWithRetailers;
    const retailerIds = partnerships.map(({ retailerId }) => retailerId);
    return retailerIds;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get retailer ids in price list.',
      getRetailerIds,
      { priceListId },
    );
  }
}

export async function getSupplierId(priceListId: string) {
  try {
    const res = await db.priceList.findFirstOrThrow({
      where: {
        id: priceListId,
      },
      select: {
        supplierId: true,
      },
    });
    const { supplierId } = res;
    return supplierId;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get supplier id in price list',
      getSupplierId,
      { priceListId },
    );
  }
}
