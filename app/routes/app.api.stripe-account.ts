import { type ActionFunctionArgs, json } from '@remix-run/node';
import { stripe } from './singletons';
import { StatusCodes } from 'http-status-codes';

//https://docs.stripe.com/connect/hosted-onboarding
async function createStripeAccount() {
  try {
    const account = await stripe.accounts.create({});
    return account;
  } catch (error) {
    throw new Error(
      'An error occurred when calling the Stripe API to create an account:',
      error as Error,
    );
  }
}

async function createAccountLink(accountId: string) {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: 'https://example.com/refresh', // when the account link expires
      return_url: 'https://example.com/return', // where to redirect the user after they complete the onboarding
      type: 'account_onboarding',
    });
    return accountLink;
  } catch (error) {
    throw new Error(
      'An error occurred when calling the Stripe API to create an account link:',
      error as Error,
    );
  }
}

// eslint-disable-next-line no-empty-pattern
export const action = async ({}: ActionFunctionArgs) => {
  try {
    // apparently you need to provide country of connected account, do later
    const account = await createStripeAccount();
    const accountLink = await createAccountLink(account.id);
    return json(
      { account: account.id, onboardingUrl: accountLink.url },
      { status: StatusCodes.OK },
    );
  } catch (error) {
    console.error(
      'An error occurred when calling the Stripe API to create an account:',
      error,
    );
    return json(
      {
        error:
          "'An error occurred when calling the Stripe API to create an account.",
      },
      { status: StatusCodes.INTERNAL_SERVER_ERROR },
    );
  }
};
