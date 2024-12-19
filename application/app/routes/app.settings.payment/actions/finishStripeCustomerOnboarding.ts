import { StatusCodes } from 'http-status-codes';
import { CHECKLIST_ITEM_KEYS } from '~/constants';
import { getChecklistItem } from '~/services/models/checklistItem.server';
import {
  getChecklistStatus,
  markCheckListStatus,
} from '~/services/models/checklistStatus.server';
import { changePaymentMethodStatus } from '~/services/models/stripeCustomerAccount.server';
import { createJSONSuccess, getRouteError, logError } from '~/lib/utils/server';

async function finishStripeCustomerOnboarding(sessionId: string) {
  try {
    const checklistItemId = (
      await getChecklistItem(CHECKLIST_ITEM_KEYS.RETAILER_ADD_PAYMENT_METHOD)
    ).id;
    const checklistStatus = await getChecklistStatus(
      sessionId,
      checklistItemId,
    );

    await Promise.all([
      markCheckListStatus(checklistStatus.id, true),
      changePaymentMethodStatus(sessionId, true),
    ]);

    return createJSONSuccess(
      'Finished adding payment method for stripe customer.',
      StatusCodes.OK,
    );
  } catch (error) {
    logError(error, { sessionId });
    return getRouteError(error, 'Failed to finish Stripe Customer onboarding.');
  }
}

export default finishStripeCustomerOnboarding;
