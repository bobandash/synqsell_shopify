import db from '~/db.server';

export async function userHasStripeConnectAccount(supplierId: string) {
  const stripeAccount = await db.stripeConnectAccount.findFirst({
    where: {
      supplierId,
    },
  });
  return stripeAccount !== null;
}

export async function addStripeConnectAccountDb(
  supplierId: string,
  stripeAccountId: string,
) {
  const newStripeAccount = await db.stripeConnectAccount.create({
    data: {
      stripeAccountId,
      supplierId,
    },
  });
  return newStripeAccount;
}
