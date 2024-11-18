import { PLANS } from '~/constants';
import { getAppBaseUrl } from '~/lib/utils/server';
import { addBilling, userHasBilling } from '~/services/models/billing.server';

// https://shopify.dev/docs/api/shopify-app-remix/v2/apis/billing
export async function requireBilling(
  shop: string,
  isTest: boolean,
  billing: any,
) {
  // pops up a screen if there's no billing on Shopify
  const appBaseUrl = getAppBaseUrl(shop);
  return await billing.require({
    plans: [PLANS.BASIC_PLAN],
    isTest,
    onFailure: async () =>
      billing.request({
        plan: PLANS.BASIC_PLAN,
        isTest,
        returnUrl: appBaseUrl,
      }),
  });
}

export async function addBillingToDatabaseIfNotExists(
  shop: string,
  sessionId: string,
  isTest: boolean,
  billing: any,
) {
  const billingPlans = await billing.check({
    plans: [PLANS.BASIC_PLAN],
    isTest,
  });
  const { appSubscriptions } = billingPlans;

  if (
    appSubscriptions.length === 0 ||
    !appSubscriptions[0].lineItems ||
    appSubscriptions[0].lineItems.length === 0
  ) {
    throw new Error(
      `Shopify store ${shop} does not have any usage billing plans.`,
    );
  }

  // record billing api to call in webhooks
  const hasBillingInDb = await userHasBilling(sessionId);
  if (!hasBillingInDb) {
    const { id } = appSubscriptions[0].lineItems[0];
    addBilling(sessionId, id, PLANS.BASIC_PLAN);
  }
}
