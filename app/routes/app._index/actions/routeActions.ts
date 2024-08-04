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
  getFulfillmentService,
} from "~/models/fulfillmentService";
import type { FormDataObject, GraphQL } from "~/types";
import { StatusCodes } from "http-status-codes";

type toggleChecklistVisibilityData = InferType<
  typeof toggleChecklistVisibilitySchema
>;

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
    const fulfillmentService = await getFulfillmentService(shop, graphql);
    if (!fulfillmentService) {
      const newFulfillmentService = await createFulfillmentService(
        shop,
        graphql,
      );
      return json(newFulfillmentService, {
        status: StatusCodes.CREATED,
      });
    }
    return json(fulfillmentService, {
      status: StatusCodes.OK,
    });
  } catch (error) {
    throwError(error, "index");
  }
}
