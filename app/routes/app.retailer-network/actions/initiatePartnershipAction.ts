import { array, object, string } from 'yup';
import { getJSONError } from '~/util';
import { INTENTS } from '../constants';
import { hasSession } from '~/services/models/session';
import { isValidPriceList } from '~/services/models/priceList';
import { createOrUpdatePartnershipRequest } from '~/services/models/partnershipRequest';
import {
  PARTNERSHIP_REQUEST_STATUS,
  PARTNERSHIP_REQUEST_TYPE,
} from '~/constants';

type InitiatePartnershipActionProps = {
  intent: string;
  retailerId: string;
  message: string;
  supplierId: string;
  priceListIds: string[];
};

const initiatePartnershipActionSchema = object({
  intent: string().required().oneOf([INTENTS.INITIATE_PARTNERSHIP]),
  retailerId: string()
    .required()
    .test(
      'is-valid-retailer-id',
      'Retailer id must be valid',
      async (retailerId) => {
        return await hasSession(retailerId);
      },
    ),
  supplierId: string()
    .required()
    .test(
      'is-valid-supplier-id',
      'Supplier id must be valid',
      async (supplierId) => {
        return await hasSession(supplierId);
      },
    ),
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
    const newPartnershipRequest = await createOrUpdatePartnershipRequest({
      priceListIds,
      recipientId: retailerId,
      senderId: supplierId,
      message: message,
      type: PARTNERSHIP_REQUEST_TYPE.SUPPLIER,
      status: PARTNERSHIP_REQUEST_STATUS.PENDING,
    });
    return newPartnershipRequest;
  } catch (error) {
    throw getJSONError(error, 'retailer network');
  }
}

export default initiatePartnershipAction;
