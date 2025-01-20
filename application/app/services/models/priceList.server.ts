import type { Prisma } from '@prisma/client';
import db from '~/db.server';

export async function isValidPriceList(
  priceListId: string,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.priceList.count({
    where: { id: priceListId },
  });
  return count > 0;
}

export async function getPriceList(
  priceListId: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.priceList.findFirstOrThrow({
    where: { id: priceListId },
  });
}

export async function hasGeneralPriceList(
  sessionId: string,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.priceList.count({
    where: {
      isGeneral: true,
      supplierId: sessionId,
    },
  });
  return count > 0;
}

export async function getGeneralPriceList(
  sessionId: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.priceList.findFirstOrThrow({
    where: {
      isGeneral: true,
      supplierId: sessionId,
    },
  });
}

export async function userHasPriceList(
  sessionId: string,
  priceListId: string,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.priceList.count({
    where: {
      supplierId: sessionId,
      id: priceListId,
    },
  });
  return count > 0;
}

export async function deletePriceListBatch(
  priceListsIds: string[],
  sessionId: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.priceList.deleteMany({
    where: {
      id: { in: priceListsIds },
      supplierId: sessionId,
    },
  });
}

export async function getAllPriceLists(
  supplierId: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.priceList.findMany({
    where: { supplierId },
  });
}

export async function getRetailerIds(
  priceListId: string,
  tx: Prisma.TransactionClient = db,
) {
  const { partnerships } = await tx.priceList.findFirstOrThrow({
    where: { id: priceListId },
    include: {
      partnerships: {
        select: { retailerId: true },
      },
    },
  });

  return partnerships.map(({ retailerId }) => retailerId);
}
