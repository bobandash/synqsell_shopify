import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_API_KEY) {
  throw new Error('STRIPE_SECRET_KEY must be set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_API_KEY, {
  // @ts-ignore
  apiVersion: '2023-10-16',
});
