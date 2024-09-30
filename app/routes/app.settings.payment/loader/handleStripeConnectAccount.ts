import {
  addStripeConnectAccountDb,
  userHasStripeConnectAccount,
} from '~/services/models/stripeConnectAccount';
import { isAccountOnboarded } from '~/services/stripe/stripeConnect';

async function handleStripeConnectAccount(
  isSupplier: boolean,
  sessionId: string,
  accountId: string | null,
) {
  // note: account id is a string when user finishes onboarding process and stripe calls the return url
  let hasStripeConnectAccount = false;

  if (isSupplier) {
    hasStripeConnectAccount = await userHasStripeConnectAccount(sessionId);
    if (accountId && !hasStripeConnectAccount) {
      const isStripeAccountOnboarded = await isAccountOnboarded(accountId);
      if (isStripeAccountOnboarded) {
        await addStripeConnectAccountDb(sessionId, accountId);
        hasStripeConnectAccount = true;
      }
    }
  }

  return { hasStripeConnectAccount };
}

export default handleStripeConnectAccount;
