import {
  getPriceList,
  getRetailerIds,
  getSupplierId,
} from '~/services/models/priceList.server';
import { object } from 'yup';
import { priceListIdSchema, sessionIdSchema } from '~/schemas/models';
import { isAppUninstalled } from '~/services/models/session.server';
import { userHasStripeConnectAccount } from '~/services/models/stripeConnectAccount.server';
import { userHasStripePaymentMethod } from '~/services/models/stripeCustomerAccount.server';

const hasAccessToViewPriceListSchema = object({
  priceListId: priceListIdSchema,
  retailerId: sessionIdSchema,
});

async function hasStripeIntegrations(retailerId: string, supplierId: string) {
  const [supplierHasStripeConnectAccount, retailerHasStripePaymentsAccount] =
    await Promise.all([
      userHasStripeConnectAccount(supplierId),
      userHasStripePaymentMethod(retailerId),
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
  await hasAccessToViewPriceListSchema.validate({ priceListId, retailerId });
  const supplierId = await getSupplierId(priceListId);
  const [isSupplierAppUninstalled, stripeIntegrationsExist, hasViewPermission] =
    await Promise.all([
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
}

export default hasAccessToViewPriceList;
