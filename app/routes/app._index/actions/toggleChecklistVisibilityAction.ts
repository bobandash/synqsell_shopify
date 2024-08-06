import type { TypedResponse } from "@remix-run/node";
import {
  toggleChecklistVisibilitySchema,
} from "../schemas/actionSchemas";
import { toggleChecklistVisibility } from "~/models/userPreferences";

type toggleChecklistVisibilityData = InferType<
  typeof toggleChecklistVisibilitySchema
>;

export async function toggleChecklistVisibilityAction(
  formDataObject: Record<string, any>,
  shop: string,
): Promise<TypedResponse<ToggleChecklistVisibilityActionData> | undefined> {
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