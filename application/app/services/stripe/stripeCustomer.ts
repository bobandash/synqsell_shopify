import { stripe } from '~/lib/singletons';
import { errorHandler } from '~/lib/utils/server';
import { getProfile } from '../models/userProfile';
// functions related to regular stripe, to get the payment method for destination charges
// this is for the retailer

export async function createCustomer(sessionId: string) {
  try {
    const profile = await getProfile(sessionId);
    const customer = await stripe.customers.create({
      email: profile.email,
      name: profile.name,
      description: profile.website,
    });
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
      createSetupIntent,
    );
  }
}
