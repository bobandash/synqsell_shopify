import { json } from '@remix-run/node';
import createAccountLink, {
  createStripeAccount,
} from '~/services/stripe/onboarding';

type BeginStripeOnboardingData = {
  onboardingUrl: string;
};

async function beginStripeOnboarding(appBaseUrl: string) {
  const account = await createStripeAccount();
  const accountLink = await createAccountLink(account.id, appBaseUrl);
  return json({ onboardingUrl: accountLink.url });
}

export { beginStripeOnboarding, type BeginStripeOnboardingData };
