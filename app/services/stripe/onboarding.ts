import { stripe } from '~/routes/singletons';

//https://docs.stripe.com/connect/hosted-onboarding
export function getStripePublishableKey() {
  const publishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
  return publishableKey;
}

export async function createStripeAccount() {
  try {
    const account = await stripe.accounts.create({
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
    });
    return account;
  } catch (error) {
    throw new Error(
      'An error occurred when calling the Stripe API to create an account:',
      error as Error,
    );
  }
}

export async function isAccountOnboarded(accountId: string) {
  try {
    const account = await stripe.accounts.retrieve(accountId);

    const onboardedStatus =
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled &&
      account.requirements?.currently_due?.length === 0 &&
      account.requirements.disabled_reason === null;

    return onboardedStatus;
  } catch (error) {
    throw new Error(
      'An error occurred when checking if account was onboarded in Stripe API:',
      error as Error,
    );
  }
}

export async function createAccountLink(accountId: string, appBaseUrl: string) {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appBaseUrl}/app/settings/payment-refresh?accountId=${accountId}`,
      return_url: `${appBaseUrl}/app/settings/payment?accountId=${accountId}`,
      type: 'account_onboarding',
      collect: 'eventually_due',
    });
    return accountLink;
  } catch (error) {
    throw new Error(
      'An error occurred when calling the Stripe API to create an account link:',
      error as Error,
    );
  }
}

export default createAccountLink;
