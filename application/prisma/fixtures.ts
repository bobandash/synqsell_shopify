import { PLANS } from '~/constants';
import type {
  RolesOptions,
  PriceListPricingStrategyOptions,
  ChecklistItemKeysOptions,
} from '~/constants';
import { simpleFaker } from '@faker-js/faker';

export const generateSessionData = () => ({
  id: simpleFaker.string.uuid(),
  shop: simpleFaker.string.uuid(),
  accessToken: simpleFaker.string.uuid(),
  state: '',
});

export const generateBillingData = (sessionId: string) => ({
  id: simpleFaker.string.uuid(),
  shopifySubscriptionLineItemId: simpleFaker.string.uuid(),
  plan: PLANS.BASIC_PLAN,
  sessionId,
});

export const generateCarrierServiceData = (retailerId: string) => ({
  id: simpleFaker.string.uuid(),
  shopifyCarrierServiceId: simpleFaker.string.uuid(),
  retailerId,
});

export const generateChecklistTableData = (position: number) => ({
  id: simpleFaker.string.uuid(),
  position,
  header: simpleFaker.string.uuid(),
  subheader: simpleFaker.string.uuid(),
});

export const generateChecklistItemData = (
  key: ChecklistItemKeysOptions,
  position: number,
  checklistTableId: string,
) => ({
  id: simpleFaker.string.uuid(),
  key,
  position,
  header: simpleFaker.string.uuid(),
  subheader: simpleFaker.string.uuid(),
  buttonText: simpleFaker.string.uuid(),
  checklistTableId,
});

export const generateChecklistStatusData = (
  sessionId: string,
  checklistItemId: string,
  isCompleted: boolean,
) => ({
  id: simpleFaker.string.uuid(),
  checklistItemId,
  isCompleted,
  sessionId,
});

export const generateUserPreferenceData = (
  sessionId: string,
  tableIdsHidden: string[],
) => ({
  id: simpleFaker.string.uuid(),
  tableIdsHidden,
  sessionId,
});

export const generateFulfillmentServiceData = (sessionId: string) => ({
  id: simpleFaker.string.uuid(),
  sessionId,
  shopifyFulfillmentServiceId: simpleFaker.string.alphanumeric(10),
  shopifyLocationId: simpleFaker.string.alphanumeric(10),
});

export const generatePriceListData = ({
  supplierId,
  isGeneral,
  pricingStrategy,
}: {
  supplierId: string;
  isGeneral: boolean;
  pricingStrategy: PriceListPricingStrategyOptions;
}) => {
  return {
    id: simpleFaker.string.uuid(),
    createdAt: simpleFaker.date.recent(),
    pricingStrategy,
    supplierId,
    isGeneral,
    name: simpleFaker.string.alpha(5),
    requiresApprovalToImport: false,
    margin: 10,
  };
};

export const generateProductData = (priceListId: string) => ({
  id: simpleFaker.string.uuid(),
  priceListId,
  shopifyProductId: simpleFaker.string.alpha(10),
  createdAt: simpleFaker.date.recent(),
});

export const generateVariantData = (dbProductId: string) => ({
  id: simpleFaker.string.uuid(),
  productId: dbProductId,
  shopifyVariantId: simpleFaker.string.alpha(10),
  retailPrice: simpleFaker.string.numeric(2),
  retailerPayment: simpleFaker.string.numeric(2),
  supplierProfit: simpleFaker.string.numeric(2),
});

export const generateInventoryItemData = (dbVariantId: string) => ({
  id: simpleFaker.string.uuid(),
  variantId: dbVariantId,
  shopifyInventoryItemId: simpleFaker.string.alpha(10),
});

export const generateImportedVariantData = (dbVariantId: string) => ({
  id: simpleFaker.string.uuid(),
  importedProductId: simpleFaker.string.alpha(10),
  prismaVariantId: dbVariantId,
  shopifyVariantId: simpleFaker.string.alpha(10),
});

export const generateImportedInventoryItemData = (
  dbInventoryItemId: string,
  dbImportedVariantId: string,
) => ({
  id: simpleFaker.string.uuid(),
  shopifyInventoryItemId: simpleFaker.string.alpha(10),
  importedVariantId: dbImportedVariantId,
  prismaInventoryItemId: dbInventoryItemId,
});

export const generateRoleData = (
  sessionId: string,
  name: RolesOptions,
  isVisibleInNetwork: boolean = true,
) => ({
  id: simpleFaker.string.uuid(),
  name,
  sessionId,
  createdAt: simpleFaker.date.recent(),
  isVisibleInNetwork,
});

export const generateStripeConnectAccountData = (supplierId: string) => ({
  id: simpleFaker.string.uuid(),
  stripeAccountId: simpleFaker.string.uuid(),
  supplierId,
  createdAt: simpleFaker.date.recent(),
  updatedAt: simpleFaker.date.recent(),
});
