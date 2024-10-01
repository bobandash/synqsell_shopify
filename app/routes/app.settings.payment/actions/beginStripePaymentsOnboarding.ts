import { json } from '@remix-run/node';
import createAccountLink, {
  createStripeAccount,
} from '~/services/stripe/stripeConnect';

type BeginStripeOnboardingData = {
  onboardingUrl: string;
};

async function beginStripePaymentsOnboarding(appBaseUrl: string) {
  const account = await createStripeAccount();
  const accountLink = await createAccountLink(account.id, appBaseUrl);
  return json({ onboardingUrl: accountLink.url });
}

export { beginStripePaymentsOnboarding, type BeginStripeOnboardingData };
