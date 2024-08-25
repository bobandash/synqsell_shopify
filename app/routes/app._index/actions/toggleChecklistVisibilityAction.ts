import { json } from '@remix-run/node';
import type { TypedResponse } from '@remix-run/node';
import {
  toggleChecklistVisibility,
  type UserPreferenceData,
} from '~/services/models/userPreferences';
import { object, string, type InferType } from 'yup';
import { StatusCodes } from 'http-status-codes';
import { getJSONError } from '~/util';
import { INTENTS } from '../constants';
import { hasChecklistTable } from '~/services/models/checklistTable';

const toggleChecklistVisibilitySchema = object({
  intent: string().oneOf([INTENTS.TOGGLE_CHECKLIST_VISIBILITY]).required(),
  tableId: string()
    .required()
    .test('table-id', 'Invalid table id', async (value) => {
      return await hasChecklistTable(value);
    }),
});

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
    throw getJSONError(error, 'index');
  }
}
