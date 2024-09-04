import { object, string } from 'yup';
import { INTENTS, type IntentsProps } from '../constants';
import { hasSession } from '~/services/models/session';
import { createOrUpdatePartnershipRequestTx } from '~/services/models/partnershipRequest';
import {
  getGeneralPriceList,
  hasGeneralPriceList,
} from '~/services/models/priceList';
import {
  CHECKLIST_ITEM_KEYS,
  PARTNERSHIP_REQUEST_STATUS,
  PARTNERSHIP_REQUEST_TYPE,
} from '~/constants';
import { json } from '@remix-run/node';
import { StatusCodes } from 'http-status-codes';
import { getJSONError } from '~/util';
import db from '~/db.server';
import { updateChecklistStatusTx } from '~/services/models/checklistStatus';

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

const sessionIdSchema = string()
  .required()
  .test(
    'is-valid-session-id',
    'Session id must be valid',
    async (sessionId) => {
      const sessionExists = await hasSession(sessionId);
      return sessionExists;
    },
  );

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
    return json(
      { message: 'Successfully created partnership request.' },
      StatusCodes.CREATED,
    );
  } catch (error) {
    throw getJSONError(error, 'supplier network');
  }
}

export default requestAccessAction;
