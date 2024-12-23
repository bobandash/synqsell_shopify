import { array, object, string } from 'yup';
import { createJSONSuccess, getRouteError, logError } from '~/lib/utils/server';
import { INTENTS } from '../constants';
import { isValidPriceList } from '~/services/models/priceList.server';
import {
  CHECKLIST_ITEM_KEYS,
  PARTNERSHIP_REQUEST_STATUS,
  PARTNERSHIP_REQUEST_TYPE,
} from '~/constants';
import { StatusCodes } from 'http-status-codes';
import db from '~/db.server';
import { updateChecklistStatusTx } from '~/services/models/checklistStatus.server';
import { createOrUpdatePartnershipRequestTx } from '~/services/models/partnershipRequest.server';
import { sessionIdSchema } from '~/schemas/models';

type InitiatePartnershipActionProps = {
  intent: string;
  retailerId: string;
  message: string;
  supplierId: string;
  priceListIds: string[];
};

const initiatePartnershipActionSchema = object({
  intent: string().required().oneOf([INTENTS.INITIATE_PARTNERSHIP]),
  retailerId: sessionIdSchema,
  supplierId: sessionIdSchema,
  message: string().required(),
  priceListIds: array()
    .of(string().required())
    .required()
    .test(
      'at-least-one-price-list-id',
      'There must be at least one price list selected.',
      (priceListIds) => {
        return priceListIds.length > 0;
      },
    )
    .test(
      'is-valid-price-list-ids',
      'Price list ids must be valid.',
      async (priceListIds) => {
        const validationPromises = priceListIds.map((id) =>
          isValidPriceList(id),
        );
        const results = await Promise.all(validationPromises);
        const isPriceListIdsValid = results.every((result) => result === true);
        return isPriceListIdsValid;
      },
    ),
});

async function initiatePartnershipAction(
  props: InitiatePartnershipActionProps,
) {
  try {
    await initiatePartnershipActionSchema.validate(props);
    const { retailerId, message, supplierId, priceListIds } = props;
    await db.$transaction(async (tx) => {
      await Promise.all([
        updateChecklistStatusTx(
          tx,
          supplierId,
          CHECKLIST_ITEM_KEYS.SUPPLIER_EXPLORE_NETWORK,
          true,
        ),
        createOrUpdatePartnershipRequestTx({
          tx,
          priceListIds,
          recipientId: retailerId,
          senderId: supplierId,
          message: message,
          type: PARTNERSHIP_REQUEST_TYPE.SUPPLIER,
          status: PARTNERSHIP_REQUEST_STATUS.PENDING,
        }),
      ]);
    });

    return createJSONSuccess(
      'Successfully sent partnership request to retailer.',
      StatusCodes.CREATED,
    );
  } catch (error) {
    logError(error);
    return getRouteError(
      error,
      'Failed to initiate partnership request. Please try again later.',
    );
  }
}

export default initiatePartnershipAction;
