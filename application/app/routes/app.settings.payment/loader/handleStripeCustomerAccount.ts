import {
  addInitialStripeCustomerAccount as addInitialStripeCustomerAccountDb,
  getStripeCustomerAccount,
  userHasStripeCustomerAccount,
} from '~/services/models/stripeCustomerAccount';
import {
  createCustomer,
  getClientSecret,
} from '~/services/stripe/stripeCustomer';

async function handleStripeCustomerAccount(
  isRetailer: boolean,
  sessionId: string,
) {
  let stripeCustomerId = null;
  let clientSecret = null;
  let hasPaymentMethod = false;
  if (!isRetailer) {
    return { clientSecret, hasPaymentMethod };
  }

  const hasStripeCustomerAccount =
    await userHasStripeCustomerAccount(sessionId);

  if (!hasStripeCustomerAccount) {
    const customer = await createCustomer(sessionId);
    await addInitialStripeCustomerAccountDb(sessionId, customer.id);
    stripeCustomerId = customer.id;
  } else {
    const stripeCustomerAccount = await getStripeCustomerAccount(sessionId);
    hasPaymentMethod = stripeCustomerAccount.hasPaymentMethod;
    stripeCustomerId = stripeCustomerAccount.stripeCustomerId;
  }

  clientSecret = await getClientSecret(stripeCustomerId);
  return { clientSecret, hasPaymentMethod };
}

export default handleStripeCustomerAccount;
