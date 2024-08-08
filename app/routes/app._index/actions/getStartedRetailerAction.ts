import { json } from "@remix-run/node";
import type { TypedResponse } from "@remix-run/node";
import { getStartedRetailerSchema } from "../schemas/actionSchemas";
import { type InferType } from "yup";
import { throwError } from "~/util";
import {
  createFulfillmentService,
  deleteFulfillmentService,
  getFulfillmentService,
} from "~/models/fulfillmentService/createFulfillmentService";
import type { FulfillmentServiceProps } from "~/models/fulfillmentService/createFulfillmentService";
import type { FormDataObject, GraphQL } from "~/types";
import { StatusCodes } from "http-status-codes";
import {
  getChecklistStatus,
  markCheckListStatus,
} from "~/models/checklistStatus";
import type { ChecklistStatusProps } from "~/models/checklistStatus";
import createHttpError from "http-errors";
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
  shop: string,
): Promise<TypedResponse<GetStartedRetailerActionData> | undefined> {
  try {
    await getStartedRetailerSchema.validate(formDataObject);
    const { checklistItemId } = formDataObject as unknown as getRetailerData;
    const [checklistStatus, fulfillmentService, retailerRole] =
      await Promise.all([
        getChecklistStatus(shop, checklistItemId),
        getFulfillmentService(shop, graphql),
        getRole(shop, ROLES.RETAILER),
      ]);

    if (fulfillmentService && checklistStatus.isCompleted && retailerRole) {
      return handleCompleted(fulfillmentService, checklistStatus, retailerRole);
    }

    return await handleCreateMissingFields(
      fulfillmentService,
      checklistStatus,
      retailerRole,
      shop,
      graphql,
    );
  } catch (error) {
    throwError(error, "index");
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
  shop: string,
  graphql: GraphQL,
) {
  let newFulfillmentService = fulfillmentService;
  let newChecklistStatus = checklistStatus;
  let newRole = retailerRole;
  try {
    if (!newFulfillmentService) {
      newFulfillmentService = await createFulfillmentService(shop, graphql);
    }
    if (!newChecklistStatus.isCompleted) {
      newChecklistStatus = await markCheckListStatus(checklistStatus.id, true);
    }
    if (!newRole) {
      newRole = await addRole(shop, ROLES.RETAILER);
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
        await deleteFulfillmentService(shop, newFulfillmentService.id, graphql);
      }
      if (newChecklistStatus.isCompleted) {
        await markCheckListStatus(newChecklistStatus.id, false);
      }
      if (newRole) {
        await deleteRole(newRole.id);
      }
      throwError(error, "getStartedRetailerAction");
    } catch (error) {
      if (createHttpError.isHttpError(error)) throw error;
      throw new createHttpError.InternalServerError(
        `handleCreateMissingFields (shop: ${shop}): Failed to rollback fulfillment service creation.`,
      );
    }
  }
}
