import { priceListExistsSchema } from '~/services/models/priceList/schemas';
import { errorHandler } from '~/services/util';
import { getPriceList, getRetailerIds } from '~/services/models/priceList';

// check if user has permission to view the price list
async function hasAccessToViewPriceList(
  priceListId: string,
  sessionId: string,
) {
  try {
    await priceListExistsSchema.validate(priceListId);
    const isGeneral = (await getPriceList(priceListId)).isGeneral;
    const retailerIds = await getRetailerIds(priceListId);

    if (isGeneral || retailerIds.includes(sessionId)) {
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
