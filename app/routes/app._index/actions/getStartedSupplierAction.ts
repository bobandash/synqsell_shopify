import type { FormDataObject } from '~/types';
import { object, string, type InferType } from 'yup';
import {
  getOrCreateSupplierAccessRequest,
  hasSupplierAccessRequest,
} from '~/services/models/supplierAccessRequest';
import { getJSONError } from '~/util';
import { json } from '@remix-run/node';
import { StatusCodes } from 'http-status-codes';
import { getChecklistStatus } from '~/services/models/checklistStatus';
import { INTENTS } from '../constants';
import { checklistItemIdMatchesKey } from '~/services/models/checklistItem';
import { CHECKLIST_ITEM_KEYS } from '~/constants';

export type GetStartedSupplierActionData = {
  supplierAccessRequest: {
    id: string;
    checklistStatusId: string;
    hasMetSalesThreshold: boolean;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    sessionId: string;
    notes: string | null;
    isEligibleForNewRequest: boolean;
  };
};

export const getStartedSupplierSchema = object({
  intent: string().oneOf([INTENTS.SUPPLIER_GET_STARTED]),
  checklistItemId: string()
    .required()
    .test('check-item-id', 'Invalid checklist item ID', async (value) => {
      return checklistItemIdMatchesKey(
        value,
        CHECKLIST_ITEM_KEYS.SUPPLIER_GET_STARTED,
      );
    }),
});

type getStartedSupplierData = InferType<typeof getStartedSupplierSchema>;

// For now, suppliers should be able to request access at any time
export async function getStartedSupplierAction(
  formDataObject: FormDataObject,
  sessionId: string,
) {
  try {
    await getStartedSupplierSchema.validate(formDataObject);
    const { checklistItemId } =
      formDataObject as unknown as getStartedSupplierData;
    const checklistStatus = await getChecklistStatus(
      sessionId,
      checklistItemId,
    );
    const supplierAccessRequestExists =
      await hasSupplierAccessRequest(sessionId);
    await getOrCreateSupplierAccessRequest(sessionId, checklistStatus.id);
    return json(
      {
        message:
          'Your request to become a supplier has been submitted successfully. Please wait for the app owner to review your app.',
      },
      {
        status: supplierAccessRequestExists
          ? StatusCodes.OK
          : StatusCodes.CREATED,
      },
    );
  } catch (error) {
    throw getJSONError(error, 'index');
  }
}
