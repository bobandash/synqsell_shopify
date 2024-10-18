import { json } from '@remix-run/node';
import { StatusCodes } from 'http-status-codes';
import createAccountLink, {
  createStripeAccount,
} from '~/services/stripe/stripeConnect';

type BeginStripeOnboardingData = {
  onboardingUrl: string;
};

async function beginStripeCustomerOnboarding(appBaseUrl: string) {
  const account = await createStripeAccount();
  const accountLink = await createAccountLink(account.id, appBaseUrl);
  return json({ onboardingUrl: accountLink.url }, StatusCodes.CREATED);
}

export { beginStripeCustomerOnboarding, type BeginStripeOnboardingData };
