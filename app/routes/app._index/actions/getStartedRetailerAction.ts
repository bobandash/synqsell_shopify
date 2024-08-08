import { json } from "@remix-run/node";
import type { TypedResponse } from "@remix-run/node";
import { getStartedRetailerSchema } from "../schemas/actionSchemas";
import { type InferType } from "yup";
import { getJSONError } from "~/util";
import {
  createFulfillmentService,
  deleteFulfillmentService,
  getFulfillmentService,
} from "~/models/fulfillmentService";
import type { FulfillmentServiceProps } from "~/models/fulfillmentService/createFulfillmentService";
import type { FormDataObject, GraphQL } from "~/types";
import { StatusCodes } from "http-status-codes";
import {
  getChecklistStatus,
  markCheckListStatus,
} from "~/models/checklistStatus";
import type { ChecklistStatusProps } from "~/models/checklistStatus";
import { addRole, deleteRole, getRole, type RoleProps } from "~/models/roles";
import { ROLES } from "~/constants";

type getRetailerData = InferType<typeof getStartedRetailerSchema>;

// Types for the data functions
export type GetStartedRetailerActionData = {
  fulfillmentService: FulfillmentServiceProps;
  checklistStatus: ChecklistStatusProps;
};

export async function getStartedRetailerAction(
  graphql: GraphQL,
  formDataObject: FormDataObject,
  sessionId: string,
): Promise<TypedResponse<GetStartedRetailerActionData> | undefined> {
  try {
    await getStartedRetailerSchema.validate(formDataObject);
    const { checklistItemId } = formDataObject as unknown as getRetailerData;
    const [checklistStatus, fulfillmentService, retailerRole] =
      await Promise.all([
        getChecklistStatus(sessionId, checklistItemId),
        getFulfillmentService(sessionId, graphql),
        getRole(sessionId, ROLES.RETAILER),
      ]);

    if (fulfillmentService && checklistStatus.isCompleted && retailerRole) {
      return handleCompleted(fulfillmentService, checklistStatus, retailerRole);
    }

    return await handleCreateMissingFields(
      fulfillmentService,
      checklistStatus,
      retailerRole,
      sessionId,
      graphql,
    );
  } catch (error) {
    throw getJSONError(error, "index");
  }
}

// Helper functions for getStartedRetailerAction

// Do nothing if all these fields already exist
function handleCompleted(
  fulfillmentService: FulfillmentServiceProps,
  checklistStatus: ChecklistStatusProps,
  retailerRole: RoleProps,
) {
  return json(
    { fulfillmentService, checklistStatus, role: { ...retailerRole } },
    {
      status: StatusCodes.OK,
    },
  );
}

// Either all these fields should be created or none should be created
// TODO: Refactor error handling
async function handleCreateMissingFields(
  fulfillmentService: FulfillmentServiceProps | null,
  checklistStatus: ChecklistStatusProps,
  retailerRole: RoleProps | null,
  sessionId: string,
  graphql: GraphQL,
) {
  let newFulfillmentService = fulfillmentService;
  let newChecklistStatus = checklistStatus;
  let newRole = retailerRole;
  try {
    if (!newFulfillmentService) {
      newFulfillmentService = await createFulfillmentService(
        sessionId,
        graphql,
      );
    }
    if (!newChecklistStatus.isCompleted) {
      newChecklistStatus = await markCheckListStatus(checklistStatus.id, true);
    }
    if (!newRole) {
      newRole = await addRole(sessionId, ROLES.RETAILER);
    }
    return json(
      {
        fulfillmentService: { ...newFulfillmentService },
        checklistStatus: { ...newChecklistStatus },
        role: { ...newRole },
      },
      {
        status: StatusCodes.CREATED,
      },
    );
  } catch (error) {
    // attempt to rollback all missing fields if any actions failed
    try {
      if (newFulfillmentService) {
        await deleteFulfillmentService(
          sessionId,
          newFulfillmentService.id,
          graphql,
        );
      }
      if (newChecklistStatus.isCompleted) {
        await markCheckListStatus(newChecklistStatus.id, false);
      }
      if (newRole) {
        await deleteRole(newRole.id);
      }
      throw getJSONError(error, "getStartedRetailerAction");
    } catch (error) {
      // TODO: fix error handling
      throw getJSONError(error, "getStartedRetailerAction");
      // if (createHttpError.isHttpError(error)) throw error;
      // throw new createHttpError.InternalServerError(
      //   `handleCreateMissingFields: Failed to rollback fulfillment service creation.`,
      // );
    }
  }
}
