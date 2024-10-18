import { StatusCodes } from 'http-status-codes';
import { CHECKLIST_ITEM_KEYS } from '~/constants';
import { getChecklistItem } from '~/services/models/checklistItem';
import {
  getChecklistStatus,
  markCheckListStatus,
} from '~/services/models/checklistStatus';
import { changePaymentMethodStatus } from '~/services/models/stripeCustomerAccount';
import { createJSONMessage } from '~/util';
async function finishStripeCustomerOnboarding(sessionId: string) {
  const checklistItemId = (
    await getChecklistItem(CHECKLIST_ITEM_KEYS.RETAILER_ADD_PAYMENT_METHOD)
  ).id;
  const checklistStatus = await getChecklistStatus(sessionId, checklistItemId);

  await Promise.all([
    markCheckListStatus(checklistStatus.id, true),
    changePaymentMethodStatus(sessionId, true),
  ]);

  return createJSONMessage(
    'Finished adding payment method for stripe customer.',
    StatusCodes.OK,
  );
}

export default finishStripeCustomerOnboarding;
