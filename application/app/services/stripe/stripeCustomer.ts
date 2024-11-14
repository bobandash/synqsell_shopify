import { stripe } from '~/lib/singletons';
import { getProfile } from '../models/userProfile.server';
// functions related to regular stripe, to get the payment method for destination charges
// this is for the retailer

export async function createCustomer(sessionId: string) {
  const profile = await getProfile(sessionId);
  const customer = await stripe.customers.create({
    email: profile.email,
    name: profile.name,
    description: profile.website,
  });
  return customer;
}

// TODO: add support for different currency options
// for options and recurring payment, apparently you have to pass client secret instead of bare options
export async function getClientSecret(customerId: string) {
  const intent = await stripe.setupIntents.create({
    customer: customerId,
    automatic_payment_methods: {
      enabled: true,
    },
  });
  return intent.client_secret;
}

export async function createSetupIntent(customerId: string) {
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    automatic_payment_methods: {
      enabled: true,
    },
  });
  return setupIntent;
}
