import { json } from '@remix-run/node';
import { object, string, type InferType } from 'yup';
import { getJSONError } from '~/util';
import type { FormDataObject, GraphQL } from '~/types';
import { StatusCodes } from 'http-status-codes';
import {
  getChecklistStatus,
  isChecklistStatusCompleted,
  markCheckListStatus,
} from '~/services/models/checklistStatus';
import type { ChecklistStatusProps } from '~/services/models/checklistStatus';
import {
  addRole,
  getRole,
  hasRole,
  type RoleProps,
} from '~/services/models/roles';
import { CHECKLIST_ITEM_KEYS, ROLES } from '~/constants';
import { createRoleAndCompleteChecklistItem } from '~/services/transactions';
import {
  getFulfillmentService,
  type FulfillmentServiceDBProps,
} from '~/services/models/fulfillmentService';
import {
  getOrCreateFulfillmentService,
  hasFulfillmentService,
} from '~/services/helper/fulfillmentService';
import { errorHandler } from '~/services/util';
import { INTENTS } from '../constants';
import { checklistItemIdMatchesKey } from '~/services/models/checklistItem';

const getStartedRetailerSchema = object({
  intent: string().oneOf([INTENTS.RETAILER_GET_STARTED]),
  checklistItemId: string()
    .required()
    .test('check-item-id', 'Invalid checklist item ID', async (value) => {
      return checklistItemIdMatchesKey(
        value,
        CHECKLIST_ITEM_KEYS.RETAILER_GET_STARTED,
      );
    }),
});

type getRetailerData = InferType<typeof getStartedRetailerSchema>;

// Types for the data functions
export type GetStartedRetailerActionData = {
  fulfillmentService: FulfillmentServiceDBProps;
  checklistStatus: ChecklistStatusProps;
  role: RoleProps;
};

// Guard check for fetcher data
export async function getStartedRetailerAction(
  graphql: GraphQL,
  formDataObject: FormDataObject,
  sessionId: string,
) {
  try {
    await getStartedRetailerSchema.validate(formDataObject);
    const { checklistItemId } = formDataObject as unknown as getRetailerData;
    const [
      checklistStatusCompleted,
      fulfillmentServiceExists,
      hasRetailerRole,
    ] = await Promise.all([
      isChecklistStatusCompleted(sessionId, checklistItemId),
      hasFulfillmentService(sessionId, graphql),
      hasRole(sessionId, ROLES.RETAILER),
    ]);

    if (
      checklistStatusCompleted &&
      fulfillmentServiceExists &&
      hasRetailerRole
    ) {
      const completedFields = await handleCompleted(sessionId, checklistItemId);
      return completedFields;
    }

    const newFields = await createOrGetFields(
      checklistStatusCompleted,
      fulfillmentServiceExists,
      hasRetailerRole,
      graphql,
      sessionId,
      checklistItemId,
    );

    return newFields;
  } catch (error) {
    throw getJSONError(error, 'index');
  }
}

// Just return all the relevant fields, fulfillmentService, checklistStatus, and role if the item is already completed
async function handleCompleted(sessionId: string, checklistItemId: string) {
  try {
    const [fulfillmentService, checklistStatus, role] = await Promise.all([
      getFulfillmentService(sessionId),
      getChecklistStatus(sessionId, checklistItemId),
      getRole(sessionId, ROLES.RETAILER),
    ]);
    return json(
      { fulfillmentService, checklistStatus, role },
      {
        status: StatusCodes.OK,
      },
    );
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get fulfillment service, checklist status, or retailer role.',
      handleCompleted,
      { sessionId, checklistItemId },
    );
  }
}

async function getExistingFieldsOrUndefined(
  checklistStatusCompleted: boolean,
  fulfillmentServiceExists: boolean,
  hasRetailerRole: boolean,
  sessionId: string,
  checklistItemId: string,
) {
  try {
    const fulfillmentService = fulfillmentServiceExists
      ? await getFulfillmentService(sessionId)
      : undefined;
    const checklistStatus = checklistStatusCompleted
      ? await getChecklistStatus(sessionId, checklistItemId)
      : undefined;
    const retailerRole = hasRetailerRole
      ? await getRole(sessionId, ROLES.RETAILER)
      : undefined;
    return { fulfillmentService, checklistStatus, retailerRole };
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get fulfillment service, checklist status, or retailer role.',
      getExistingFieldsOrUndefined,
      {
        checklistStatusCompleted,
        fulfillmentServiceExists,
        hasRetailerRole,
        sessionId,
        checklistItemId,
      },
    );
  }
}

// Either all these fields should be created or none should be created
async function createOrGetFields(
  checklistStatusCompleted: boolean,
  fulfillmentServiceExists: boolean,
  hasRetailerRole: boolean,
  graphql: GraphQL,
  sessionId: string,
  checklistItemId: string,
) {
  let fulfillmentService;
  let checklistStatus;
  let retailerRole;

  try {
    const fields = await getExistingFieldsOrUndefined(
      checklistStatusCompleted,
      fulfillmentServiceExists,
      hasRetailerRole,
      sessionId,
      checklistItemId,
    );
    fulfillmentService = fields.fulfillmentService;
    checklistStatus = fields.checklistStatus;
    retailerRole = fields.retailerRole;

    const checklistStatusId = (
      await getChecklistStatus(sessionId, checklistItemId)
    ).id;

    // this must be created first because it's created in the db and shopify admin api
    if (!fulfillmentService) {
      fulfillmentService = await getOrCreateFulfillmentService(
        sessionId,
        graphql,
      );
    }
    if (!checklistStatus && !retailerRole) {
      const newRoleAndChecklistStatus =
        await createRoleAndCompleteChecklistItem(
          sessionId,
          ROLES.RETAILER,
          checklistStatusId,
        );
      retailerRole = newRoleAndChecklistStatus.role;
      checklistStatus = newRoleAndChecklistStatus.checklistStatus;
    } else if (!checklistStatus) {
      checklistStatus = await markCheckListStatus(checklistStatusId, true);
    }
    if (!retailerRole) {
      retailerRole = await addRole(sessionId, ROLES.RETAILER);
    }

    return json(
      {
        fulfillmentService,
        checklistStatus,
        role: { ...retailerRole },
      },
      {
        status: StatusCodes.CREATED,
      },
    );
  } catch (error) {
    // !!! TODO: read about distributed system rollbacks
    throw getJSONError(error, 'index');
  }
}
