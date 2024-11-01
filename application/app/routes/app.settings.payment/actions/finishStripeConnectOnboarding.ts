import { StatusCodes } from 'http-status-codes';
import { CHECKLIST_ITEM_KEYS } from '~/constants';
import { getChecklistItem } from '~/services/models/checklistItem';
import {
  getChecklistStatus,
  markCheckListStatus,
} from '~/services/models/checklistStatus';
import { createJSONSuccess } from '~/lib/utils/server';
import { isAccountOnboarded } from '~/services/stripe/stripeConnect';
import { addStripeConnectAccountDb } from '~/services/models/stripeConnectAccount';

type FinishStripeConnectOnboardingData = {
  message: string;
};

async function finishStripeConnectOnboarding(
  accountId: string,
  sessionId: string,
) {
  const isStripeAccountOnboarded = await isAccountOnboarded(accountId);
  if (!isStripeAccountOnboarded) {
    return createJSONSuccess(
      'Failed to fully onboard Stripe Connect Account.',
      StatusCodes.OK, // TODO: check if this is the correct status code
    );
  }
  const checklistItemId = (
    await getChecklistItem(CHECKLIST_ITEM_KEYS.SUPPLIER_ADD_PAYMENT_METHOD)
  ).id;
  const checklistStatus = await getChecklistStatus(sessionId, checklistItemId);
  await Promise.all([
    addStripeConnectAccountDb(sessionId, accountId),
    markCheckListStatus(checklistStatus.id, true),
  ]);
  return createJSONSuccess(
    'Successfully finished onboarding Stripe Connect Account.',
    StatusCodes.OK,
  );
}

export {
  finishStripeConnectOnboarding,
  type FinishStripeConnectOnboardingData,
};
