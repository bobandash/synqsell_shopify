import { json } from "@remix-run/node";
import type { TypedResponse } from "@remix-run/node";
import { getStartedRetailerSchema } from "./_schema";
import { type InferType } from "yup";
import { errorHandler, getJSONError, getLogContext } from "~/util";
import type { FormDataObject, GraphQL } from "~/types";
import { StatusCodes } from "http-status-codes";
import {
  getChecklistStatus,
  isChecklistStatusCompleted,
  markCheckListStatus,
} from "~/models/checklistStatus";
import type { ChecklistStatusProps } from "~/models/checklistStatus";
import { addRole, getRole, hasRole, type RoleProps } from "~/models/roles";
import { ROLES } from "~/constants";
import { createRoleAndCompleteChecklistItem } from "~/models/transactions";
import {
  getFulfillmentService,
  hasFulfillmentService,
} from "~/models/fulfillmentService/getFulfillmentService";
import {
  deleteFulfillmentService,
  getOrCreateFulfillmentService,
  type FulfillmentServiceDBProps,
} from "~/models/fulfillmentService";

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
): Promise<TypedResponse<GetStartedRetailerActionData> | undefined> {
  try {
    await getStartedRetailerSchema.validate(formDataObject);
    const { checklistItemId } = formDataObject as unknown as getRetailerData;
    const [
      checklistStatusCompleted,
      fulfillmentServiceExists,
      hasRetailerRole,
    ] = await Promise.all([
      isChecklistStatusCompleted(sessionId, checklistItemId),
      hasFulfillmentService(sessionId),
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
    throw getJSONError(error, "index");
  }
}

// Helper functions for getStartedRetailerAction

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
    const context = getLogContext(handleCompleted, sessionId, checklistItemId);
    throw errorHandler(
      error,
      context,
      "Failed to get fulfillment service, checklist status, or retailer role.",
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
    const context = getLogContext(handleCompleted, sessionId, checklistItemId);
    throw errorHandler(
      error,
      context,
      "Failed to get fulfillment service, checklist status, or retailer role.",
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
  // !!! TODO: refactor before deployment
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
    } else if (!retailerRole) {
      retailerRole = await addRole(sessionId, ROLES.RETAILER);
    }

    // TODO: make this more organized / figure out the typescript error
    if (!fulfillmentService) {
      throw new Error("FulfillmentService is required.");
    }
    if (!checklistStatus) {
      throw new Error("ChecklistStatus is required.");
    }
    if (!retailerRole) {
      throw new Error("RetailerRole is required.");
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
    try {
      if (fulfillmentService) {
        await deleteFulfillmentService(
          sessionId,
          fulfillmentService.id,
          graphql,
        );
      }
      // !!! TODO: handle errors better
      throw getJSONError(error, "getStartedRetailerAction");
    } catch (error) {
      throw getJSONError(error, "getStartedRetailerAction");
    }
  }
}
