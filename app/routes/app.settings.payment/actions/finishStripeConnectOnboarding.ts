import { StatusCodes } from 'http-status-codes';
import { CHECKLIST_ITEM_KEYS } from '~/constants';
import { getChecklistItem } from '~/services/models/checklistItem';
import {
  getChecklistStatus,
  markCheckListStatus,
} from '~/services/models/checklistStatus';
import { createJSONMessage } from '~/util';
async function finishStripePaymentsOnboarding(sessionId: string) {
  const checklistItemId = (
    await getChecklistItem(CHECKLIST_ITEM_KEYS.SUPPLIER_ADD_PAYMENT_METHOD)
  ).id;
  const checklistStatus = await getChecklistStatus(sessionId, checklistItemId);
  await markCheckListStatus(checklistStatus.id, true);

  return createJSONMessage(
    'Completed checklist item for supplier payments setup',
    StatusCodes.OK,
  );
}

export default finishStripePaymentsOnboarding;
