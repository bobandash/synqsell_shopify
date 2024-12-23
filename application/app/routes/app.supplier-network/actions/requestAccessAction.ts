import { object, string } from 'yup';
import { INTENTS, type IntentsProps } from '../constants';
import { hasSession } from '~/services/models/session.server';
import { createOrUpdatePartnershipRequestTx } from '~/services/models/partnershipRequest.server';
import {
  getGeneralPriceList,
  hasGeneralPriceList,
} from '~/services/models/priceList.server';
import {
  CHECKLIST_ITEM_KEYS,
  PARTNERSHIP_REQUEST_STATUS,
  PARTNERSHIP_REQUEST_TYPE,
} from '~/constants';
import { StatusCodes } from 'http-status-codes';
import db from '~/db.server';
import { updateChecklistStatusTx } from '~/services/models/checklistStatus.server';
import { sessionIdSchema } from '~/schemas/models';
import { createJSONSuccess, getRouteError, logError } from '~/lib/utils/server';

export type RequestAccessFormData = {
  intent: IntentsProps;
  priceListSupplierId: string;
  message: string;
};

const formDataObjectSchema = object({
  intent: string().required().oneOf([INTENTS.REQUEST_ACCESS]),
  priceListSupplierId: string()
    .required()
    .test(
      'is-valid-session-id',
      'Price list supplier id must be valid',
      async (sessionId) => {
        const sessionExists = await hasSession(sessionId);
        return sessionExists;
      },
    )
    .test(
      'has-general-price-list',
      'Price list supplier has general price list',
      async (sessionId) => {
        const generalPriceListExists = await hasGeneralPriceList(sessionId);
        return generalPriceListExists;
      },
    ),
  message: string().required(),
});

export async function requestAccessAction(
  formDataObject: RequestAccessFormData,
  sessionId: string,
) {
  try {
    await Promise.all([
      formDataObjectSchema.validate(formDataObject),
      sessionIdSchema.validate(sessionId),
    ]);
    const { priceListSupplierId, message } = formDataObject;
    const generalPriceListId = (await getGeneralPriceList(sessionId)).id;
    await db.$transaction(async (tx) => {
      await Promise.all([
        updateChecklistStatusTx(
          tx,
          sessionId,
          CHECKLIST_ITEM_KEYS.RETAILER_REQUEST_PARTNERSHIP,
          true,
        ),
        createOrUpdatePartnershipRequestTx({
          tx,
          priceListIds: [generalPriceListId],
          recipientId: priceListSupplierId,
          senderId: sessionId,
          message: message,
          type: PARTNERSHIP_REQUEST_TYPE.RETAILER,
          status: PARTNERSHIP_REQUEST_STATUS.PENDING,
        }),
      ]);
    });

    return createJSONSuccess(
      'Successfully created partnership request.',
      StatusCodes.CREATED,
    );
  } catch (error) {
    logError(error, { sessionId });
    return getRouteError(
      error,
      'Failed to request supplier access. Please try again later.',
    );
  }
}

export default requestAccessAction;
