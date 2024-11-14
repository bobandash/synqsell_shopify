import { PLANS } from '~/constants';
import { getAppBaseUrl } from '~/lib/utils/server';
import { addBilling, userHasBilling } from '~/services/models/billing.server';

// https://shopify.dev/docs/api/shopify-app-remix/v2/apis/billing
async function requireBilling(shop: string, isTest: boolean, billing: any) {
  // pops up a screen if there's no billing on Shopify
  const appBaseUrl = getAppBaseUrl(shop);
  await billing.require({
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

async function addBillingToDatabase(
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
  const hasBillingInDb = userHasBilling(sessionId);
  if (!hasBillingInDb) {
    const { id } = appSubscriptions[0].lineItems[0];
    addBilling(sessionId, id, PLANS.BASIC_PLAN);
  }
}

async function handleBilling(shop: string, sessionId: string, billing: any) {
  let isTest = true;
  if (process.env.NODE_ENV === 'production') {
    isTest = false;
  }
  await requireBilling(shop, isTest, billing);
  await addBillingToDatabase(shop, sessionId, isTest, billing);
}

export default handleBilling;
