import { type FormDataObject } from '~/types';
import { array, object, string, type InferType } from 'yup';
import { deletePriceListBatch } from '~/services/models/priceList.server';
import { createJSONSuccess, getRouteError, logError } from '~/lib/utils/server';
import { INTENTS } from '../constants';
import { StatusCodes } from 'http-status-codes';
type deletePriceListData = InferType<typeof deletePriceListSchema>;

const deletePriceListSchema = object({
  intent: string().oneOf([INTENTS.DELETE_PRICE_LIST]).required(),
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
    return createJSONSuccess(
      `Successfully deleted the price list(s).`,
      StatusCodes.OK,
    );
  } catch (error) {
    logError(error, 'Action: Delete price list.');
    return getRouteError('Failed to delete price list.', error);
  }
}

export default deletePriceListAction;
