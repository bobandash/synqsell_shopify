import { json } from "@remix-run/node";
import {
  getStartedRetailerSchema,
  toggleChecklistVisibilitySchema,
} from "../schemas/actionSchemas";
import { toggleChecklistVisibility } from "~/models/userPreferences";
import { type InferType } from "yup";
import { throwError } from "~/util";
import {
  createFulfillmentService,
  deleteFulfillmentService,
  getFulfillmentService,
} from "~/models/fulfillmentService";
import type { FormDataObject, GraphQL } from "~/types";
import { StatusCodes } from "http-status-codes";
import {
  getChecklistStatus,
  markCheckListStatusCompleted,
} from "~/models/checklistStatus";
import createHttpError from "http-errors";

type toggleChecklistVisibilityData = InferType<
  typeof toggleChecklistVisibilitySchema
>;

type getRetailerData = InferType<typeof getStartedRetailerSchema>;

export async function toggleChecklistVisibilityAction(
  formDataObject: Record<string, any>,
  shop: string,
) {
  try {
    await toggleChecklistVisibilitySchema.validate(formDataObject);
    const { tableId } =
      formDataObject as unknown as toggleChecklistVisibilityData;
    const newPreferences = await toggleChecklistVisibility(shop, tableId);
    return json(newPreferences, {
      status: StatusCodes.OK,
    });
  } catch (error) {
    throwError(error, "index");
  }
}

export async function getStartedRetailerAction(
  graphql: GraphQL,
  formDataObject: FormDataObject,
  shop: string,
) {
  try {
    await getStartedRetailerSchema.validate(formDataObject);
    const { checklistItemId } = formDataObject as unknown as getRetailerData;
    const [checklistStatus, fulfillmentService] = await Promise.all([
      getChecklistStatus(shop, checklistItemId),
      getFulfillmentService(shop, graphql),
    ]);

    if (fulfillmentService && checklistStatus.isCompleted) {
      return json(
        { fulfillmentService, checklistStatus },
        {
          status: StatusCodes.OK,
        },
      );
    }

    if (!fulfillmentService && checklistStatus.isCompleted) {
      const newFulfillmentService = await createFulfillmentService(
        shop,
        graphql,
      );
      return json(
        { checklistStatus, newFulfillmentService },
        {
          status: StatusCodes.CREATED,
        },
      );
    }

    if (fulfillmentService && !checklistStatus.isCompleted) {
      const newChecklistStatus = await markCheckListStatusCompleted(
        checklistStatus.id,
      );
      return json(
        { newChecklistStatus, fulfillmentService },
        {
          status: StatusCodes.CREATED,
        },
      );
    }

    // main case, both fulfillment service and check list status do not exist
    let newFulfillmentService;
    try {
      newFulfillmentService = await createFulfillmentService(shop, graphql);
      const newChecklistStatus = await markCheckListStatusCompleted(
        checklistStatus.id,
      );
      return json(
        { newFulfillmentService, newChecklistStatus },
        { status: StatusCodes.CREATED },
      );
    } catch {
      // rollback if fulfillment service was created
      try {
        if (newFulfillmentService) {
          await deleteFulfillmentService(
            shop,
            newFulfillmentService.id,
            graphql,
          );
        }
      } catch {
        throw new createHttpError.InternalServerError(
          `getStartedRetailerAction (shop: ${shop}): Failed to rollback fulfillment service creation.`,
        );
      }
    }
  } catch (error) {
    throwError(error, "index");
  }
}
