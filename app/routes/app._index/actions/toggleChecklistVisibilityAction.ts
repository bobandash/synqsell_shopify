import { json } from "@remix-run/node";
import type { TypedResponse } from "@remix-run/node";
import { toggleChecklistVisibilitySchema } from "../schemas/actionSchemas";
import { toggleChecklistVisibility } from "~/models/userPreferences";
import { type InferType } from "yup";
import type { UserPreferenceData } from "~/models/types";
import { StatusCodes } from "http-status-codes";
import { getJSONError } from "~/util";

type toggleChecklistVisibilityData = InferType<
  typeof toggleChecklistVisibilitySchema
>;

export type ToggleChecklistVisibilityActionData = UserPreferenceData;

export async function toggleChecklistVisibilityAction(
  formDataObject: Record<string, any>,
  sessionId: string,
): Promise<TypedResponse<ToggleChecklistVisibilityActionData> | undefined> {
  try {
    await toggleChecklistVisibilitySchema.validate(formDataObject);
    const { tableId } =
      formDataObject as unknown as toggleChecklistVisibilityData;
    const newPreferences = await toggleChecklistVisibility(sessionId, tableId);
    return json(newPreferences, {
      status: StatusCodes.OK,
    });
  } catch (error) {
    throw getJSONError(error, "index");
  }
}
