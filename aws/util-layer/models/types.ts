export type Session = {
  id: string;
  shop: string;
  state: string;
  isOnline: boolean;
  scope?: string;
  expires?: Date;
  accessToken: string;
  userId?: bigint;
  firstName?: string;
  lastName?: string;
  email?: string;
  accountOwner: boolean;
  locale?: string;
  collaborator?: boolean;
  emailVerified?: boolean;
  storefrontAccessToken?: string;
  isAppUninstalled: boolean;
};

export type Order = {
  id: string;
  currency: string;
  retailerShopifyFulfillmentOrderId: string;
  supplierShopifyOrderId: string;
  retailerId: string | null;
  supplierId: string | null;
  shippingCost: number;
  paymentStatus: string;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderLineItem = {
  id: string;
  retailerShopifyVariantId: string;
  supplierShopifyVariantId: string;
  retailPricePerUnit: number;
  retailerProfitPerUnit: number;
  supplierProfitPerUnit: number;
  retailerShopifyOrderLineItemId: string;
  supplierShopifyOrderLineItemId: string;
  quantity: number;
  quantityFulfilled: number;
  quantityPaid: number;
  quantityCancelled: number;
  orderId: string;
  priceListId: string;
};

export type Fulfillment = {
  id: string;
  supplierShopifyFulfillmentId: string;
  retailerShopifyFulfillmentId: string;
  orderId: string;
};

export type FulfillmentService = {
  id: string;
  sessionId: string;
  shopifyFulfillmentServiceId: string;
  shopifyLocationId: string;
};
