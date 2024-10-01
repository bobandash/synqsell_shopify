import { errorHandler } from '~/services/util';
import { getPriceList, getRetailerIds } from '~/services/models/priceList';
import { object } from 'yup';
import { priceListIdSchema, sessionIdSchema } from '~/schemas/models';

import { errorHandler } from '~/services/util';
import { getPriceList, getRetailerIds } from '~/services/models/priceList';
import { object } from 'yup';
import { priceListIdSchema, sessionIdSchema } from '~/schemas/models';

const hasRetailerAccessToImportPriceListSchema = object({
  priceListId: priceListIdSchema,
  sessionId: sessionIdSchema,
});

// check if user has permission to view the price list
async function hasRetailerAccessToImportPriceList(
  priceListId: string,
  sessionId: string,
) {
  try {
    await hasRetailerAccessToImportPriceListSchema.validate({
      priceListId,
      sessionId,
    });
    const requiresApprovalToImport = (await getPriceList(priceListId))
      .requiresApprovalToImport;
    const retailerIds = await getRetailerIds(priceListId);
    if (!requiresApprovalToImport || retailerIds.includes(sessionId)) {
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

const hasAccessToViewPriceListSchema = object({
  priceListId: priceListIdSchema,
  sessionId: sessionIdSchema,
});

// check if user has permission to view the price list
async function hasAccessToViewPriceList(
  priceListId: string,
  sessionId: string,
) {
  try {
    await hasAccessToViewPriceListSchema.validate({ priceListId, sessionId });
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

async function hasAccessToPriceList(priceListId: string, sessionId: string) {
  const [hasAccessToView, hasAccessToImport] = await Promise.all([
    hasAccessToViewP(priceListId, sessionId),
    hasAccessToImportPriceList(priceListId, sessionId),
  ]);

  if (!hasAccessToImport && !hasAccessToView) {
    return false;
  }
  return true;
}

export default hasAccessToViewPriceList;
