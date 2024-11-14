import {
  toggleChecklistVisibility,
  type UserPreferenceData,
} from '~/services/models/userPreferences.server';
import { object, string, type InferType } from 'yup';
import { StatusCodes } from 'http-status-codes';
import { INTENTS } from '../constants';
import { hasChecklistTable } from '~/services/models/checklistTable.server';
import { createJSONSuccess, getRouteError, logError } from '~/lib/utils/server';

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
) {
  try {
    await toggleChecklistVisibilitySchema.validate(formDataObject);
    const { tableId } =
      formDataObject as unknown as toggleChecklistVisibilityData;
    await toggleChecklistVisibility(sessionId, tableId);
    return createJSONSuccess(
      'Successfully toggled checklist visibility.',
      StatusCodes.OK,
    );
  } catch (error) {
    logError(error, 'Action: toggleChecklistVisibilityAction');
    return getRouteError('Failed to toggle checklist table visibility.', error);
  }
}
