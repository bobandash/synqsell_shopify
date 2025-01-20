import type { Prisma } from '@prisma/client';
import db from '~/db.server';

export async function userHasCarrierService(
  retailerId: string,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.carrierService.count({
    where: { retailerId },
  });
  return count > 0;
}

export async function createCarrierService(
  retailerId: string,
  shopifyCarrierServiceId: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.carrierService.create({
    data: {
      retailerId,
      shopifyCarrierServiceId,
    },
  });
}

export async function userGetCarrierService(
  retailerId: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.carrierService.findFirstOrThrow({
    where: { retailerId },
  });
}

export async function deleteCarrierService(
  retailerId: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.carrierService.delete({
    where: { retailerId },
  });
}
