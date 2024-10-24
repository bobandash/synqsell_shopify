import { errorHandler } from '~/services/util';
import {
  getPriceList,
  getRetailerIds,
  getSupplierId,
} from '~/services/models/priceList';
import { object } from 'yup';
import { priceListIdSchema, sessionIdSchema } from '~/schemas/models';
import {
  hasStripeConnectAccount,
  hasStripePaymentsAccount,
  isAppUninstalled,
} from '~/services/models/session';

const hasAccessToViewPriceListSchema = object({
  priceListId: priceListIdSchema,
  retailerId: sessionIdSchema,
});

async function hasStripeIntegrations(retailerId: string, supplierId: string) {
  const [supplierHasStripeConnectAccount, retailerHasStripePaymentsAccount] =
    await Promise.all([
      hasStripeConnectAccount(supplierId),
      hasStripePaymentsAccount(retailerId),
    ]);

  if (!supplierHasStripeConnectAccount || !retailerHasStripePaymentsAccount) {
    return false;
  }
  return true;
}

async function hasPermissionFromSupplierToView(
  priceListId: string,
  retailerId: string,
) {
  const [{ isGeneral: isGeneralPriceList }, retailerIds] = await Promise.all([
    getPriceList(priceListId),
    getRetailerIds(priceListId),
  ]);
  if (isGeneralPriceList || retailerIds.includes(retailerId)) {
    return true;
  }
}

// check if user has permission to view the price list
async function hasAccessToViewPriceList(
  priceListId: string,
  retailerId: string,
) {
  try {
    await hasAccessToViewPriceListSchema.validate({ priceListId, retailerId });
    const supplierId = await getSupplierId(priceListId);
    const [
      isSupplierAppUninstalled,
      stripeIntegrationsExist,
      hasViewPermission,
    ] = await Promise.all([
      isAppUninstalled(supplierId),
      hasStripeIntegrations(retailerId, supplierId),
      hasPermissionFromSupplierToView(priceListId, retailerId),
    ]);

    if (!stripeIntegrationsExist || isSupplierAppUninstalled) {
      return false;
    }

    if (hasViewPermission) {
      return true;
    }

    return false;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if user has access to view price list.',
      hasAccessToViewPriceList,
      { priceListId, retailerId },
    );
  }
}

export default hasAccessToViewPriceList;
