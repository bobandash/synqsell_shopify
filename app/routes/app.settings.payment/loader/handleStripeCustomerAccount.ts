import {
  addInitialStripeCustomerAccount,
  getStripeCustomerAccount,
  userHasStripeCustomerAccount,
} from '~/services/models/stripeCustomerAccount';
import {
  createCustomer,
  getClientSecret,
  hasPaymentMethod,
} from '~/services/stripe/stripeCustomer';

async function handleStripeCustomerAccount(
  isRetailer: boolean,
  sessionId: string,
) {
  let customerId = null;
  let clientSecret = null;
  let hasCustomerPaymentMethod = false;
  if (!isRetailer) {
    return { clientSecret, hasCustomerPaymentMethod };
  }

  const hasStripeCustomerAccountInDb =
    await userHasStripeCustomerAccount(sessionId);
  if (!hasStripeCustomerAccountInDb) {
    const customer = await createCustomer();
    customerId = customer.id;
    await addInitialStripeCustomerAccount(sessionId, customer.id);
  } else {
    customerId = (await getStripeCustomerAccount(sessionId)).stripeCustomerId;
    hasCustomerPaymentMethod = await hasPaymentMethod(customerId);
  }
  clientSecret = await getClientSecret(customerId);
  return { clientSecret, hasCustomerPaymentMethod };
}

export default handleStripeCustomerAccount;
