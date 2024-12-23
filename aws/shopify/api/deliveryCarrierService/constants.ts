// Note: responses ha to be unique every time, otherwise will eventually receive a 502 Bad Gateway
// The server, working as a gateway got an invalid response.
export const RESPONSE = {
    BACKUP: {
        statusCode: 404,
        body: JSON.stringify([]),
    },
    EMPTY: {
        statusCode: 200,
        body: JSON.stringify([]),
    },
    SAMPLE: {
        // sample response payload in shopify's docs
        statusCode: 200,
        body: JSON.stringify({
            rates: [
                {
                    service_name: 'canadapost-overnight',
                    service_code: 'ON',
                    total_price: '1295',
                    description: 'This is the fastest option by far',
                    currency: 'CAD',
                    min_delivery_date: '2013-04-12 14:48:45 -0400',
                    max_delivery_date: '2013-04-12 14:48:45 -0400',
                },
                {
                    service_name: 'fedex-2dayground',
                    service_code: '2D',
                    total_price: '2934',
                    currency: 'USD',
                    min_delivery_date: '2013-04-12 14:48:45 -0400',
                    max_delivery_date: '2013-04-12 14:48:45 -0400',
                },
                {
                    service_name: 'fedex-priorityovernight',
                    service_code: '1D',
                    total_price: '3587',
                    currency: 'USD',
                    min_delivery_date: '2013-04-12 14:48:45 -0400',
                    max_delivery_date: '2013-04-12 14:48:45 -0400',
                },
            ],
        }),
    },
};

export const SERVICE_CODE = {
    ECONOMY_INTERNATIONAL: 'economy_international',
    STANDARD: 'standard_shipping',
    EXPEDITED: 'expedited_mail',
    CUSTOM: 'custom',
};

export const SHIPPING_RATE = {
    ECONOMY: 'Economy',
    STANDARD: 'Standard',
    INTERNATIONAL: 'International Shipping',
    CUSTOM: 'Custom',
};
