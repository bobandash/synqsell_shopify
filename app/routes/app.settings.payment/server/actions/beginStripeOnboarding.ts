import { json } from '@remix-run/node';
import { stripe } from '~/routes/singletons';
import { createAccountLink } from '../util';

type BeginStripeOnboardingData = {
  accountId: string;
  onboardingUrl: string;
};

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

async function beginStripeOnboarding(appPaymentUrl: string) {
  const account = await createStripeAccount();
  const accountLink = await createAccountLink(account.id, appPaymentUrl);
  return json({ accountId: account.id, onboardingUrl: accountLink.url });
}

export { beginStripeOnboarding, type BeginStripeOnboardingData };
