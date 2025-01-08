import { Payload } from '../../types';

type LineItems = Payload['line_items'];

const createLineItem = (rawShopifyProductId: number, rawShopifyVariantId: number, shopifyLineItemId: string) => ({
    id: 1,
    variant_id: rawShopifyVariantId,
    title: 'Product 1',
    quantity: 2,
    sku: 'SKU1',
    variant_title: null,
    vendor: 'Vendor 1',
    fulfillment_service: 'manual',
    product_id: rawShopifyProductId,
    requires_shipping: true,
    taxable: true,
    gift_card: false,
    name: 'Product 1',
    variant_inventory_management: 'shopify',
    properties: [],
    product_exists: true,
    fulfillable_quantity: 2,
    grams: 500,
    price: '20.00',
    total_discount: '0.00',
    fulfillment_status: null,
    price_set: {
        shop_money: {
            amount: '20.00',
            currency_code: 'USD',
        },
        presentment_money: {
            amount: '20.00',
            currency_code: 'USD',
        },
    },
    total_discount_set: {
        shop_money: {
            amount: '0.00',
            currency_code: 'USD',
        },
        presentment_money: {
            amount: '0.00',
            currency_code: 'USD',
        },
    },
    discount_allocations: [],
    duties: [],
    admin_graphql_api_id: shopifyLineItemId,
    tax_lines: [],
});

const createSamplePayload = (rawShopifyOrderId: number, shopifyFulfillmentId: string, lineItems: LineItems) => {
    return {
        id: 1,
        order_id: rawShopifyOrderId,
        status: 'open',
        created_at: new Date().toISOString(),
        service: 'standard',
        updated_at: new Date().toISOString(),
        tracking_company: 'UPS',
        shipment_status: null,
        location_id: 10,
        origin_address: null,
        email: 'customer@example.com',
        destination: {
            first_name: 'John',
            address1: '123 Main St',
            phone: null,
            city: 'City',
            zip: '12345',
            province: null,
            country: 'US',
            last_name: 'Doe',
            address2: null,
            company: null,
            latitude: 40.7128,
            longitude: -74.006,
            name: 'John Doe',
            country_code: 'US',
            province_code: null,
        },
        line_items: lineItems,
        tracking_number: '1Z9999999999999999',
        tracking_numbers: ['1Z9999999999999999'],
        tracking_url: 'https://www.ups.com/track?loc=en_US&tracknum=1Z9999999999999999',
        tracking_urls: ['https://www.ups.com/track?loc=en_US&tracknum=1Z9999999999999999'],
        receipt: {},
        name: `Order #1`,
        admin_graphql_api_id: shopifyFulfillmentId,
    };
};

export { createLineItem, createSamplePayload };
