export const ORDER_PAYMENT_STATUS = {
    INITIATED: 'INITIATED',
    INCOMPLETE: 'INCOMPLETE',
    PARTIALLY_PAID: 'PARTIALLY_PAID',
    PAID: 'PAID',
    CANCELLED: 'CANCELLED',
} as const;

export const ROLES = {
    RETAILER: 'RETAILER',
    SUPPLIER: 'SUPPLIER',
} as const;

export const RESPONSE = {
    NOT_RELATED: {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Fulfillment update is not related to Synqsell fulfillment.',
        }),
    },
    SUCCESS: {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Successfully handled fulfillments update procedure.',
        }),
    },
    ERROR: {
        statusCode: 500,
        body: JSON.stringify({
            message: 'Failed to handle fulfillments update procedure..',
        }),
    },
};
