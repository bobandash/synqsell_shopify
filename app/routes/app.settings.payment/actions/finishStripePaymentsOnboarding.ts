import { StatusCodes } from 'http-status-codes';
import { CHECKLIST_ITEM_KEYS } from '~/constants';
import {
  getChecklistStatus,
  markCheckListStatus,
} from '~/services/models/checklistStatus';
import { createJSONMessage } from '~/util';
async function finishStripePaymentsOnboarding(sessionId: string) {
  const checklistStatus = await getChecklistStatus(
    sessionId,
    CHECKLIST_ITEM_KEYS.RETAILER_ADD_PAYMENT_METHOD,
  );
  await markCheckListStatus(checklistStatus.id, true);

  return createJSONMessage(
    'Completed checklist item for retailer payments setup.',
    StatusCodes.OK,
  );
}

export default finishStripePaymentsOnboarding;
