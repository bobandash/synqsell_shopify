import { PLANS } from "./constants";
import type {
  RolesOptions,
  PriceListPricingStrategyOptions,
  ChecklistItemKeysOptions,
  PartnershipRequestTypeOptions,
  PartnershipRequestStatusOptions,
} from "@db/constants";
import { simpleFaker } from "@faker-js/faker";

export const generateSessionData = () => ({
  id: simpleFaker.string.uuid(),
  shop: simpleFaker.string.uuid(),
  accessToken: simpleFaker.string.uuid(),
  state: "",
});

export const generateUserProfileData = (sessionId: string) => ({
  id: simpleFaker.string.uuid(),
  name: simpleFaker.string.alpha(10),
  email: simpleFaker.string.alpha(10),
  logo: simpleFaker.string.alphanumeric(10),
  biography: simpleFaker.string.alphanumeric(10),
  desiredProducts: simpleFaker.string.alphanumeric(10),
  sessionId,
  address: simpleFaker.string.alphanumeric(10),
  website: simpleFaker.string.alpha(10),
  currencyCode: "USD",
});

export const generateSocialMediaLinkData = (userProfileId: string) => ({
  id: simpleFaker.string.uuid(),
  facebook: simpleFaker.string.uuid(),
  twitter: simpleFaker.string.uuid(),
  instagram: simpleFaker.string.uuid(),
  youtube: simpleFaker.string.uuid(),
  tiktok: simpleFaker.string.uuid(),
  userProfileId,
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
  checklistTableId: string
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
  isCompleted: boolean
) => ({
  id: simpleFaker.string.uuid(),
  checklistItemId,
  isCompleted,
  sessionId,
});

export const generateUserPreferenceData = (
  sessionId: string,
  tableIdsHidden: string[]
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

export const generateImportedProductData = (
  dbProductId: string,
  retailerId: string
) => ({
  id: simpleFaker.string.uuid(),
  retailerId,
  importedAt: simpleFaker.date.recent(),
  prismaProductId: dbProductId,
  shopifyProductId: simpleFaker.string.uuid(),
});

export const generateInventoryItemData = (dbVariantId: string) => ({
  id: simpleFaker.string.uuid(),
  variantId: dbVariantId,
  shopifyInventoryItemId: simpleFaker.string.alpha(10),
});

export const generateImportedVariantData = (
  dbVariantId: string,
  dbImportedProductId: string
) => ({
  id: simpleFaker.string.uuid(),
  importedProductId: dbImportedProductId,
  prismaVariantId: dbVariantId,
  shopifyVariantId: simpleFaker.string.alpha(10),
});

export const generateImportedInventoryItemData = (
  dbInventoryItemId: string,
  dbImportedVariantId: string
) => ({
  id: simpleFaker.string.uuid(),
  shopifyInventoryItemId: simpleFaker.string.alpha(10),
  importedVariantId: dbImportedVariantId,
  prismaInventoryItemId: dbInventoryItemId,
});

export const generatePartnershipRequestData = (
  senderId: string,
  recipientId: string,
  status: PartnershipRequestStatusOptions,
  type: PartnershipRequestTypeOptions
) => ({
  id: simpleFaker.string.uuid(),
  senderId,
  recipientId,
  message: simpleFaker.string.alpha(10),
  status,
  type,
  createdAt: simpleFaker.date.recent(),
});

export const generatePartnershipData = (
  retailerId: string,
  supplierId: string
) => ({
  id: simpleFaker.string.uuid(),
  retailerId,
  supplierId,
  createdAt: simpleFaker.date.recent(),
  message: simpleFaker.string.uuid(),
});

export const generateRoleData = (
  sessionId: string,
  name: RolesOptions,
  isVisibleInNetwork: boolean = true
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

export const generateStripeCustomerAccountData = (
  retailerId: string,
  hasPaymentMethod: boolean
) => ({
  id: simpleFaker.string.uuid(),
  stripeCustomerId: simpleFaker.string.uuid(),
  retailerId,
  hasPaymentMethod,
  createdAt: simpleFaker.date.recent(),
  updatedAt: simpleFaker.date.recent(),
});

export const generateFulfillmentData = (orderId: string) => ({
  id: simpleFaker.string.uuid(),
  supplierShopifyFulfillmentId: simpleFaker.string.uuid(),
  retailerShopifyFulfillmentId: simpleFaker.string.uuid(),
  orderId,
});

export const generateOrderData = (
  retailerId: string,
  supplierId: string,
  currency = "USD",
  paymentStatus = "INCOMPLETE",
  shippingCost = 0
) => ({
  id: simpleFaker.string.uuid(),
  currency,
  retailerShopifyFulfillmentOrderId: simpleFaker.string.uuid(),
  supplierShopifyOrderId: simpleFaker.string.uuid(),
  retailerId,
  supplierId,
  shippingCost,
  paymentStatus,
  createdAt: simpleFaker.date.recent(),
  updatedAt: simpleFaker.date.recent(),
});

export const generateOrderLineItemData = (
  orderId: string,
  priceListId?: string
) => ({
  id: simpleFaker.string.uuid(),
  retailerShopifyVariantId: simpleFaker.string.uuid(),
  supplierShopifyVariantId: simpleFaker.string.uuid(),
  retailPricePerUnit: Number(simpleFaker.number.float({ min: 10, max: 100 })),
  retailerProfitPerUnit: Number(simpleFaker.number.float({ min: 1, max: 20 })),
  supplierProfitPerUnit: Number(simpleFaker.number.float({ min: 1, max: 10 })),
  retailerShopifyOrderLineItemId: simpleFaker.string.uuid(),
  supplierShopifyOrderLineItemId: simpleFaker.string.uuid(),
  quantity: simpleFaker.number.int({ min: 1, max: 10 }),
  quantityFulfilled: 0,
  quantityPaid: 0,
  quantityCancelled: 0,
  orderId,
  priceListId,
});

export const generatePaymentData = (
  orderId: string,
  fulfillmentId: string
) => ({
  id: simpleFaker.string.uuid(),
  orderId,
  stripeEventId: simpleFaker.string.uuid(),
  status: "PENDING",
  orderPaid: Number(simpleFaker.number.float({ min: 10, max: 1000 })),
  shippingPaid: Number(simpleFaker.number.float({ min: 5, max: 50 })),
  totalPaid: Number(simpleFaker.number.float({ min: 15, max: 1050 })),
  createdAt: simpleFaker.date.recent(),
  fulfillmentId,
});

export const generateBillingTransactionData = (
  paymentId: string,
  sessionId?: string
) => ({
  id: simpleFaker.string.uuid(),
  createdAt: simpleFaker.date.recent(),
  paymentId,
  shopifyUsageRecordId: simpleFaker.string.uuid(),
  amountPaid: Number(simpleFaker.number.float({ min: 5, max: 500 })),
  currencyCode: "USD",
  sessionId,
});
