import { priceListExistsSchema } from '~/services/models/priceList/schemas';
import { errorHandler } from '~/services/util';
import { getPriceList } from '~/services/models/priceList';
import { getPriceListRetailerIds } from '~/services/models/priceListRetailer';

// check if user has permission to view the price list
async function hasAccessToViewPriceList(
  priceListId: string,
  sessionId: string,
) {
  try {
    await priceListExistsSchema.validate(priceListId);
    const isGeneral = (await getPriceList(priceListId)).isGeneral;
    const priceListRetailerIds = await getPriceListRetailerIds(priceListId);

    if (isGeneral || priceListRetailerIds.includes(sessionId)) {
      return true;
    }
    return false;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if user has access to view price list.',
      hasAccessToViewPriceList,
      { priceListId, sessionId },
    );
  }
}

export default hasAccessToViewPriceList;