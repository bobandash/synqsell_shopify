export const ORDER_PAYMENT_STATUS = {
    INCOMPLETE: 'INCOMPLETE',
    PARTIALLY_PAID: 'PARTIALLY_PAID',
    PAID: 'PAID',
    CANCELLED: 'CANCELLED',
} as const;

export type OrderPaymentStatusOptions = (typeof ORDER_PAYMENT_STATUS)[keyof typeof ORDER_PAYMENT_STATUS];

export const SERVICE_CODE = {
    ECONOMY_INTERNATIONAL: 'economy_international',
    STANDARD: 'standard_shipping',
    EXPEDITED: 'expedited_mail',
    CUSTOM: 'custom',
} as const;

export type ServiceCodeProps = (typeof SERVICE_CODE)[keyof typeof SERVICE_CODE];

export const SHIPPING_RATE = {
    ECONOMY: 'Economy',
    STANDARD: 'Standard',
    INTERNATIONAL: 'International Shipping',
    CUSTOM: 'Custom',
};
