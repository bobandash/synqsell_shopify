import { object, string, type InferType } from 'yup';
import type { FormDataObject, GraphQL } from '~/types';
import { StatusCodes } from 'http-status-codes';
import {
  getChecklistStatus,
  isChecklistStatusCompleted,
  markCheckListStatus,
} from '~/services/models/checklistStatus.server';
import type { ChecklistStatusProps } from '~/services/models/checklistStatus.server';
import {
  addRole,
  hasRole,
  type RoleProps,
} from '~/services/models/roles.server';
import { CHECKLIST_ITEM_KEYS, ROLES } from '~/constants';
import { createRoleAndCompleteChecklistItem } from '~/services/transactions';
import { type FulfillmentServiceDBProps } from '~/services/models/fulfillmentService.server';
import {
  getOrCreateFulfillmentService,
  hasFulfillmentService,
} from '~/services/helper/fulfillmentService';
import { INTENTS } from '../constants';
import { checklistItemIdMatchesKey } from '~/services/models/checklistItem.server';
import { createJSONSuccess, getRouteError, logError } from '~/lib/utils/server';

const getStartedRetailerSchema = object({
  intent: string().oneOf([INTENTS.RETAILER_GET_STARTED]),
  checklistItemId: string()
    .required()
    .test('check-item-id', 'Invalid checklist item ID', async (value) => {
      const isValid = await checklistItemIdMatchesKey(
        value,
        CHECKLIST_ITEM_KEYS.RETAILER_GET_STARTED,
      );
      return isValid;
    }),
});

type RetailerData = InferType<typeof getStartedRetailerSchema>;

// Types for the data functions
export type GetStartedRetailerActionData = {
  fulfillmentService: FulfillmentServiceDBProps;
  checklistStatus: ChecklistStatusProps;
  role: RoleProps;
};

// Either all these fields should be created or none should be created
async function becomeRetailer(
  fulfillmentServiceExists: boolean,
  checklistStatusCompleted: boolean,
  hasRetailerRole: boolean,
  graphql: GraphQL,
  sessionId: string,
  checklistItemId: string,
) {
  if (!fulfillmentServiceExists) {
    await getOrCreateFulfillmentService(sessionId, graphql);
  }
  const checklistStatusId = (
    await getChecklistStatus(sessionId, checklistItemId)
  ).id;
  if (!checklistStatusCompleted && !hasRetailerRole) {
    await createRoleAndCompleteChecklistItem(
      sessionId,
      ROLES.RETAILER,
      checklistStatusId,
    );
  } else if (!checklistStatusCompleted) {
    await markCheckListStatus(checklistStatusId, true);
  } else if (!hasRetailerRole) {
    await addRole(sessionId, ROLES.RETAILER);
  }
}

// NOTE: it's okay to not rollback the fulfillment service in a transaction if the action fails
// because at the worst case, the retailer will still have to click on the checklist status (which will not be completed)
export async function getStartedRetailerAction(
  graphql: GraphQL,
  formDataObject: FormDataObject,
  sessionId: string,
) {
  try {
    await getStartedRetailerSchema.validate(formDataObject);
    const { checklistItemId } = formDataObject as RetailerData;
    const [
      checklistStatusCompleted,
      fulfillmentServiceExists,
      hasRetailerRole,
    ] = await Promise.all([
      isChecklistStatusCompleted(sessionId, checklistItemId),
      hasFulfillmentService(sessionId, graphql),
      hasRole(sessionId, ROLES.RETAILER),
    ]);

    const isRetailer =
      checklistStatusCompleted && fulfillmentServiceExists && hasRetailerRole;
    if (isRetailer) {
      return createJSONSuccess('User is already a retailer.', StatusCodes.OK);
    }
    await becomeRetailer(
      fulfillmentServiceExists,
      checklistStatusCompleted,
      hasRetailerRole,
      graphql,
      sessionId,
      checklistItemId,
    );
    return createJSONSuccess(
      'You have successfully became a retailer.',
      StatusCodes.OK,
    );
  } catch (error) {
    logError(error, { sessionId });
    return getRouteError(
      error,
      'Failed to become a retailer. Please try again later.',
    );
  }
}
