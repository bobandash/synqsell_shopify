import { errorHandler } from '../util';
import db from '~/db.server';

export async function userHasStripeCustomerAccount(retailerId: string) {
  try {
    const stripeAccount = await db.stripeCustomerAccount.findFirst({
      where: {
        retailerId,
      },
    });
    return stripeAccount !== null;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if user has stripe customer account.',
      userHasStripeCustomerAccount,
      { retailerId },
    );
  }
}

export async function addInitialStripeCustomerAccount(
  retailerId: string,
  stripeCustomerId: string,
) {
  try {
    const newStripeCustomerAccount = db.stripeCustomerAccount.create({
      data: {
        retailerId,
        stripeCustomerId,
      },
    });
    return newStripeCustomerAccount;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to add stripe customer account to database.',
      addInitialStripeCustomerAccount,
      { retailerId, stripeCustomerId },
    );
  }
}

export async function getStripeCustomerAccount(retailerId: string) {
  try {
    const stripeCustomerAccount = db.stripeCustomerAccount.findFirstOrThrow({
      where: {
        retailerId,
      },
    });
    return stripeCustomerAccount;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to retrieve stripe customer account.',
      getStripeCustomerAccount,
      { retailerId },
    );
  }
}

export async function userHasStripePaymentMethod(retailerId: string) {
  try {
    const hasStripeCustomerAccount =
      await userHasStripeCustomerAccount(retailerId);

    if (!hasStripeCustomerAccount) {
      return false;
    }
    const stripeCustomerAccount = await getStripeCustomerAccount(retailerId);
    return stripeCustomerAccount.hasPaymentMethod;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if user has a stripe payment method.',
      userHasStripePaymentMethod,
      { retailerId },
    );
  }
}

export async function changePaymentMethodStatus(
  retailerId: string,
  hasPaymentMethod: boolean,
) {
  try {
    await db.stripeCustomerAccount.update({
      where: {
        retailerId,
      },
      data: {
        hasPaymentMethod,
      },
    });
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to change payment method status.',
      changePaymentMethodStatus,
      { retailerId },
    );
  }
}
