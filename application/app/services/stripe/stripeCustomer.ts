import { stripe } from '~/routes/singletons';
import { errorHandler } from '../util';
// functions related to regular stripe, to get the payment method for destination charges
// this is for the retailer

// TODO: add fields to add relevant details
export async function createCustomer() {
  try {
    const customer = await stripe.customers.create();
    return customer;
  } catch (error) {
    throw errorHandler(
      error,
      'An error occurred when calling the Stripe API to create an customer.',
      createCustomer,
    );
  }
}

// TODO: add support for different currency options
// for options and recurring payment, apparently you have to pass client secret instead of bare options
export async function getClientSecret(customerId: string) {
  try {
    const intent = await stripe.setupIntents.create({
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
    });
    return intent.client_secret;
  } catch (error) {
    throw errorHandler(
      error,
      'An error occurred when calling the Stripe API to create an intent.',
      getClientSecret,
    );
  }
}

export async function createSetupIntent(customerId: string) {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
    });
    return setupIntent;
  } catch (error) {
    throw errorHandler(
      error,
      'An error occurred when calling the Stripe API to create a setup intent.',
      getClientSecret,
    );
  }
}

export async function hasPaymentMethod(customerId: string) {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return paymentMethods.data.length > 0;
  } catch (error) {
    throw errorHandler(
      error,
      'An error occurred when calling the Stripe API to create a setup intent.',
      hasPaymentMethod,
    );
  }
}
