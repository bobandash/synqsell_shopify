import { errorHandler } from '../util';
import db from '~/db.server';

export async function userHasStripeConnectAccount(supplierId: string) {
  try {
    const stripeAccount = await db.stripeConnectAccount.findFirst({
      where: {
        supplierId,
      },
    });
    return stripeAccount !== null;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if user has stripe connect account.',
      userHasStripeConnectAccount,
      { supplierId },
    );
  }
}

export async function addStripeConnectAccountDb(
  supplierId: string,
  stripeAccountId: string,
) {
  try {
    const newStripeAccount = await db.stripeConnectAccount.create({
      data: {
        stripeAccountId,
        supplierId,
      },
    });
    return newStripeAccount;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to add stripe account to database.',
      addStripeConnectAccountDb,
      { supplierId, stripeAccountId },
    );
  }
}
