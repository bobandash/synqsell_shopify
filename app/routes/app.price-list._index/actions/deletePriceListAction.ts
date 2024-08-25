import { type FormDataObject } from '~/types';
import { deletePriceListSchema } from './_schema';
import { type InferType } from 'yup';
import { deletePriceListBatch } from '~/services/models/priceList';
import { getJSONError } from '~/util';

type deletePriceListData = InferType<typeof deletePriceListSchema>;

// !!! Decide whether or not you should have validation (correct sessionId) to call these functions
export async function deletePriceListAction(
  formDataObject: FormDataObject,
  sessionId: string,
) {
  try {
    await deletePriceListSchema.validate(formDataObject);
    const { priceListIds } = formDataObject as unknown as deletePriceListData;
    const priceListIdsArr = JSON.parse(priceListIds) as string[];
    const deletedPriceLists = await deletePriceListBatch(
      priceListIdsArr,
      sessionId,
    );
    return deletedPriceLists;
  } catch (error) {
    throw getJSONError(error, 'Price List');
  }
}
