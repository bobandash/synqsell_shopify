import db from '~/db.server';
import { errorHandler } from '~/lib/utils/server';

// currently there's only one billing plan, so this code should work
// but it must be refactored when more billing plans are added
export async function userHasBilling(sessionId: string) {
  try {
    const billing = await db.billing.findFirst({
      where: {
        sessionId,
      },
    });

    if (billing) {
      return true;
    }
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if user has Shopify billing.',
      userHasBilling,
      {
        sessionId,
      },
    );
  }
}

export async function addBilling(
  sessionId: string,
  shopifySubscriptionLineItemId: string,
  plan: string,
) {
  try {
    await db.billing.create({
      data: {
        shopifySubscriptionLineItemId,
        sessionId,
        plan,
      },
    });
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to add shopify billing to database.',
      addBilling,
      {
        sessionId,
      },
    );
  }
}
