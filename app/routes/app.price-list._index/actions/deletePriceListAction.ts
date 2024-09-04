import { type FormDataObject } from '~/types';
import { array, object, string, type InferType } from 'yup';
import { deletePriceListBatch } from '~/services/models/priceList';
import { getJSONError } from '~/util';
import { MODALS } from '../constants';
import { json } from '@remix-run/node';
import { StatusCodes } from 'http-status-codes';
type deletePriceListData = InferType<typeof deletePriceListSchema>;

const deletePriceListSchema = object({
  intent: string().oneOf([MODALS.DELETE_PRICE_LIST]).required(),
  priceListIds: array().of(string().required()).required(),
});

async function deletePriceListAction(
  formDataObject: FormDataObject,
  sessionId: string,
) {
  try {
    await deletePriceListSchema.validate(formDataObject);
    const { priceListIds } = formDataObject as unknown as deletePriceListData;
    const priceListIdsArr = priceListIds;
    await deletePriceListBatch(priceListIdsArr, sessionId);
    return json(
      { message: `Successfully deleted the price list(s).` },
      StatusCodes.OK,
    );
  } catch (error) {
    throw getJSONError(error, 'Price List');
  }
}

export default deletePriceListAction;
