import { json } from '@remix-run/node';
import { StatusCodes } from 'http-status-codes';
import { getRouteError, logError } from '~/lib/utils/server';
import createAccountLink, {
  createStripeAccount,
} from '~/services/stripe/stripeConnect';

type BeginStripeOnboardingData = {
  onboardingUrl: string;
};

async function beginStripeConnectOnboarding(appBaseUrl: string) {
  try {
    const account = await createStripeAccount();
    const accountLink = await createAccountLink(account.id, appBaseUrl);
    return json({ onboardingUrl: accountLink.url }, StatusCodes.CREATED);
  } catch (error) {
    logError(error, 'Action: Start Stripe Connect Onboarding');
    return getRouteError('Failed to begin stripe connect onboarding.', error);
  }
}

export { beginStripeConnectOnboarding, type BeginStripeOnboardingData };
