export type Session = {
  id: string;
  shop: string;
  state: string;
  isOnline: boolean;
  scope: string | null;
  expires: Date | null;
  accessToken: string;
  userId: bigint | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  accountOwner: boolean;
  locale: string | null;
  collaborator: boolean | null;
  emailVerified: boolean | null;
  storefrontAccessToken: string | null;
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

export type Product = {
  id: string;
  priceListId: string;
  shopifyProductId: string;
  createdAt: Date;
};
