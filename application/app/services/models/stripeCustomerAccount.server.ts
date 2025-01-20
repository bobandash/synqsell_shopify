import type { Prisma } from '@prisma/client';
import db from '~/db.server';

export async function userHasStripeCustomerAccount(
  retailerId: string,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.stripeCustomerAccount.count({
    where: { retailerId },
  });
  return count > 0;
}

export async function addInitialStripeCustomerAccount(
  retailerId: string,
  stripeCustomerId: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.stripeCustomerAccount.create({
    data: {
      retailerId,
      stripeCustomerId,
    },
  });
}

export async function getStripeCustomerAccount(
  retailerId: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.stripeCustomerAccount.findFirstOrThrow({
    where: { retailerId },
  });
}

export async function userHasStripePaymentMethod(
  retailerId: string,
  tx: Prisma.TransactionClient = db,
) {
  const hasAccount = await userHasStripeCustomerAccount(retailerId, tx);

  if (!hasAccount) {
    return false;
  }

  const { hasPaymentMethod } = await getStripeCustomerAccount(retailerId, tx);
  return hasPaymentMethod;
}

export async function changePaymentMethodStatus(
  retailerId: string,
  hasPaymentMethod: boolean,
  tx: Prisma.TransactionClient = db,
) {
  return tx.stripeCustomerAccount.update({
    where: { retailerId },
    data: { hasPaymentMethod },
  });
}
