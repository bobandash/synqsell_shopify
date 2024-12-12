export const ROLES = {
  RETAILER: "retailer",
  SUPPLIER: "supplier",
  ADMIN: "admin",
} as const;

export const ORDER_PAYMENT_STATUS = {
  INITIATED: "INITIATED",
  INCOMPLETE: "INCOMPLETE",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
} as const;

export const PRODUCT_STATUS = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
  DRAFT: "DRAFT",
} as const;

export type RolesOptions = (typeof ROLES)[keyof typeof ROLES];
export type OrderPaymentStatusOptions =
  (typeof ORDER_PAYMENT_STATUS)[keyof typeof ORDER_PAYMENT_STATUS];
