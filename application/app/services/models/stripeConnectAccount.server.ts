import type { Prisma } from '@prisma/client';
import db from '~/db.server';

export async function userHasStripeConnectAccount(
  supplierId: string,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.stripeConnectAccount.count({
    where: { supplierId },
  });
  return count > 0;
}

export async function addStripeConnectAccount(
  supplierId: string,
  stripeAccountId: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.stripeConnectAccount.create({
    data: {
      stripeAccountId,
      supplierId,
    },
  });
}
