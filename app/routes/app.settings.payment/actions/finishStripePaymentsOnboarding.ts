import { json } from '@remix-run/node';
import { CHECKLIST_ITEM_KEYS } from '~/constants';
import {
  getChecklistStatus,
  markCheckListStatus,
} from '~/services/models/checklistStatus';
async function finishStripePaymentsOnboarding(sessionId: string) {
  const checklistStatus = await getChecklistStatus(
    sessionId,
    CHECKLIST_ITEM_KEYS.RETAILER_ADD_PAYMENT_METHOD,
  );
  await markCheckListStatus(checklistStatus.id, true);

  return json({
    message: 'Completed checklist item for retailer payments setup.',
  });
}

export default finishStripePaymentsOnboarding;
