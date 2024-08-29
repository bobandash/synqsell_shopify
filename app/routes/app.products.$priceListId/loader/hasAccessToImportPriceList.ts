import { priceListExistsSchema } from '~/services/models/priceList/schemas';
import { errorHandler } from '~/services/util';
import { getPriceList } from '~/services/models/priceList';
import { getPriceListRetailerIds } from '~/services/models/priceListRetailer';

// check if user has permission to view the price list
async function hasRetailerAccessToImportPriceList(
  priceListId: string,
  sessionId: string,
) {
  try {
    await priceListExistsSchema.validate(priceListId);
    const requiresApprovalToImport = (await getPriceList(priceListId))
      .requiresApprovalToImport;
    const priceListRetailerIds = await getPriceListRetailerIds(priceListId);

    if (!requiresApprovalToImport || priceListRetailerIds.includes(sessionId)) {
      return true;
    }
    return false;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if user has access to import products from price list.',
      hasRetailerAccessToImportPriceList,
      { priceListId, sessionId },
    );
  }
}

export default hasRetailerAccessToImportPriceList;
