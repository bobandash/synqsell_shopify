export const ORDER_PAYMENT_STATUS = {
  INCOMPLETE: "INCOMPLETE",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
} as const;

export const ROLES = {
  RETAILER: "RETAILER",
  SUPPLIER: "SUPPLIER",
} as const;

export const PAYMENT_STATUS = {
  INITIATED: "INITIATED",
} as const;

export type OrderPaymentStatusProps =
  (typeof ORDER_PAYMENT_STATUS)[keyof typeof ORDER_PAYMENT_STATUS];
export type RolesProps = (typeof ROLES)[keyof typeof ROLES];
export type PaymentStatusProps =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
