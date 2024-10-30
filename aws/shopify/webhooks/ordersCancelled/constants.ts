export const ORDER_PAYMENT_STATUS = {
    INCOMPLETE: 'INCOMPLETE',
    PARTIALLY_PAID: 'PARTIALLY_PAID',
    PAID: 'PAID',
    CANCELLED: 'CANCELLED',
} as const;

export type OrderPaymentStatusOptions = (typeof ORDER_PAYMENT_STATUS)[keyof typeof ORDER_PAYMENT_STATUS];
