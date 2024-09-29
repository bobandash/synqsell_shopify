export function getStripePublishableKey() {
  const publishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
  return publishableKey;
}
