import db from '~/db.server';

// currently there's only one billing plan, so this code should work
// but it must be refactored when more billing plans are added
export async function userHasBilling(sessionId: string) {
  const billing = await db.billing.findFirst({
    where: {
      sessionId,
    },
  });

  if (billing) {
    return true;
  }
}

export async function addBilling(
  sessionId: string,
  shopifySubscriptionLineItemId: string,
  plan: string,
) {
  await db.billing.create({
    data: {
      shopifySubscriptionLineItemId,
      sessionId,
      plan,
    },
  });
}
