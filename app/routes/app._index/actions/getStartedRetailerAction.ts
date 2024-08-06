import { json } from "@remix-run/node";
import type { TypedResponse } from "@remix-run/node";
import { getStartedRetailerSchema } from "../schemas/actionSchemas";
import { type InferType } from "yup";
import { throwError } from "~/util";
import {
  createFulfillmentService,
  deleteFulfillmentService,
  getFulfillmentService,
} from "~/models/fulfillmentService";
import type { FulfillmentServiceProps } from "~/models/fulfillmentService";
import type { FormDataObject, GraphQL } from "~/types";
import { StatusCodes } from "http-status-codes";
import {
  getChecklistStatus,
  markCheckListStatusCompleted,
} from "~/models/checklistStatus";
import type { ChecklistStatusProps } from "~/models/checklistStatus";
import createHttpError from "http-errors";

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
    const [checklistStatus, fulfillmentService] = await Promise.all([
      getChecklistStatus(shop, checklistItemId),
      getFulfillmentService(shop, graphql),
    ]);

    if (fulfillmentService && checklistStatus.isCompleted) {
      return handleBothCompleted(fulfillmentService, checklistStatus);
    }

    if (!fulfillmentService && checklistStatus.isCompleted) {
      return await handleOnlyChecklistStatusCompleted(
        shop,
        graphql,
        checklistStatus,
      );
    }

    if (fulfillmentService && !checklistStatus.isCompleted) {
      return await handleOnlyFulfillmentServiceCreated(
        fulfillmentService,
        checklistStatus,
      );
    }

    // main case, fulfillment service does not exist and checklist status is incomplete
    return await handleCreateBothFulfillmentServiceAndChecklistStatus(
      shop,
      graphql,
      checklistStatus,
    );
  } catch (error) {
    throwError(error, "index");
  }
}

// Helper functions for getStartedRetailerAction
function handleBothCompleted(
  fulfillmentService: FulfillmentServiceProps,
  checklistStatus: ChecklistStatusProps,
) {
  return json(
    { fulfillmentService, checklistStatus },
    {
      status: StatusCodes.OK,
    },
  );
}

async function handleOnlyChecklistStatusCompleted(
  shop: string,
  graphql: GraphQL,
  checklistStatus: ChecklistStatusProps,
) {
  try {
    const newFulfillmentService = await createFulfillmentService(shop, graphql);
    return json(
      { fulfillmentService: { ...newFulfillmentService }, checklistStatus },
      {
        status: StatusCodes.CREATED,
      },
    );
  } catch (error) {
    throw error;
  }
}

async function handleOnlyFulfillmentServiceCreated(
  fulfillmentService: FulfillmentServiceProps,
  checklistStatus: ChecklistStatusProps,
) {
  try {
    const newChecklistStatus = await markCheckListStatusCompleted(
      checklistStatus.id,
    );
    return json(
      { fulfillmentService, checklistStatus: { ...newChecklistStatus } },
      {
        status: StatusCodes.CREATED,
      },
    );
  } catch (error) {
    throw error;
  }
}

async function handleCreateBothFulfillmentServiceAndChecklistStatus(
  shop: string,
  graphql: GraphQL,
  checklistStatus: ChecklistStatusProps,
) {
  let newFulfillmentService;
  try {
    newFulfillmentService = await createFulfillmentService(shop, graphql);
    const newChecklistStatus = await markCheckListStatusCompleted(
      checklistStatus.id,
    );
    return json(
      {
        fulfillmentService: { ...newFulfillmentService },
        checklistStatus: { ...newChecklistStatus },
      },
      { status: StatusCodes.CREATED },
    );
  } catch (error) {
    // rollback if fulfillment service was created
    try {
      if (newFulfillmentService) {
        await deleteFulfillmentService(shop, newFulfillmentService.id, graphql);
      }
      throw error;
    } catch (error) {
      if (createHttpError.isHttpError(error)) throw error;
      throw new createHttpError.InternalServerError(
        `getStartedRetailerAction (shop: ${shop}): Failed to rollback fulfillment service creation.`,
      );
    }
  }
}
