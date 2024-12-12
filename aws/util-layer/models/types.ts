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
