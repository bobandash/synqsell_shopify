import { type FormDataObject } from '~/types';
import { array, object, string, type InferType } from 'yup';
import { deletePriceListBatch } from '~/services/models/priceList';
import { createJSONMessage } from '~/lib/utils/server';
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
  await deletePriceListSchema.validate(formDataObject);
  const { priceListIds } = formDataObject as unknown as deletePriceListData;
  const priceListIdsArr = priceListIds;
  await deletePriceListBatch(priceListIdsArr, sessionId);
  return createJSONMessage(
    `Successfully deleted the price list(s).`,
    StatusCodes.OK,
  );
}

export default deletePriceListAction;
