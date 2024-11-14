import db from '~/db.server';

export async function isValidPriceList(priceListId: string) {
  const priceList = await db.priceList.findFirst({
    where: {
      id: priceListId,
    },
  });
  return priceList !== null;
}

export async function getPriceList(priceListId: string) {
  const priceList = await db.priceList.findFirstOrThrow({
    where: {
      id: priceListId,
    },
  });
  return priceList;
}

export async function hasGeneralPriceList(sessionId: string) {
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
}

export async function getGeneralPriceList(sessionId: string) {
  const generalPriceList = await db.priceList.findFirstOrThrow({
    where: {
      isGeneral: true,
      supplierId: sessionId,
    },
  });
  return generalPriceList;
}

export async function userHasPriceList(sessionId: string, priceListId: string) {
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
}

export async function deletePriceListBatch(
  priceListsIds: string[],
  sessionId: string,
) {
  const deletedPriceLists = await db.priceList.deleteMany({
    where: {
      id: {
        in: priceListsIds,
      },
      supplierId: sessionId,
    },
  });
  return deletedPriceLists;
}

export async function getAllPriceLists(supplierId: string) {
  // retrieves all price list ids the supplier has
  const priceLists = await db.priceList.findMany({
    where: {
      supplierId,
    },
  });
  return priceLists;
}

export async function getRetailerIds(priceListId: string) {
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
}

export async function getSupplierId(priceListId: string) {
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
}
