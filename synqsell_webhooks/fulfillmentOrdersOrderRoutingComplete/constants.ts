export const ORDER_PAYMENT_STATUS = {
    INCOMPLETE: 'INCOMPLETE',
    PARTIALLY_PAID: 'PARTIALLY_PAID',
    PAID: 'PAID',
    CANCELLED: 'CANCELLED',
} as const;

export type OrderPaymentStatusProps = (typeof ORDER_PAYMENT_STATUS)[keyof typeof ORDER_PAYMENT_STATUS];

export const RESPONSE = {
    NOT_SYNQSELL_ORDER: {
        statusCode: 200,
        body: JSON.stringify({
            message: 'This fulfillment order is not a SynqSell order.',
        }),
    },
    SUCCESS: {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Successfully created order for suppliers.',
        }),
    },
    FAILURE: {
        statusCode: 500,
        body: JSON.stringify({
            message: 'Failed to create order for suppliers.',
        }),
    },
};
