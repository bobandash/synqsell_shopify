import { errorHandler } from '../util';
import db from '~/db.server';

export async function userHasStripeAccount(sessionId: string) {
  try {
    const stripeAccount = await db.stripeAccount.findFirst({
      where: {
        sessionId,
      },
    });
    return stripeAccount !== null;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if user has stripe account.',
      userHasStripeAccount,
      { sessionId },
    );
  }
}

export async function addStripeAccount(
  sessionId: string,
  stripeAccountId: string,
) {
  try {
    const newStripeAccount = await db.stripeAccount.create({
      data: {
        stripeAccountId,
        sessionId,
      },
    });
    return newStripeAccount;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to add stripe account to database.',
      addStripeAccount,
      { sessionId, stripeAccountId },
    );
  }
}
