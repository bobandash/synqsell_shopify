import { Prisma } from '@prisma/client';
import db from '~/db.server';

// currently there's only one billing plan, so this code should work
export async function userHasBilling(
  sessionId: string,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.billing.count({
    where: { sessionId },
  });
  return count > 0;
}

export async function addBilling(
  sessionId: string,
  shopifySubscriptionLineItemId: string,
  plan: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.billing.create({
    data: {
      shopifySubscriptionLineItemId,
      sessionId,
      plan,
    },
  });
}
