import { simpleFaker } from '@faker-js/faker/.';
import { parseGid } from '@shopify/admin-graphql-api-utilities';
import { Payload } from './types';

type LineItemPayload = Payload['line_items'][0];

function generateLineItemPayload(
    shopifyProductId: string,
    shopifyVariantId: string,
    shopifyLineItemId: string,
    fulfillableQty: number,
): LineItemPayload {
    const price = simpleFaker.number.float({ min: 10, max: 500 });
    const discount = simpleFaker.number.float({ min: 0, max: 10 });
    const id = simpleFaker.string.numeric(18);

    return {
        id: Number(id),
        variant_id: Number(parseGid(shopifyVariantId)),
        title: `${simpleFaker.string.sample(8)} Product`,
        quantity: fulfillableQty,
        sku: simpleFaker.string.alphanumeric(10).toUpperCase(),
        variant_title: null,
        vendor: null,
        fulfillment_service: 'manual',
        product_id: Number(parseGid(shopifyProductId)),
        requires_shipping: true,
        taxable: true,
        gift_card: false,
        name: `${simpleFaker.string.sample(8)} Product`,
        variant_inventory_management: 'shopify',
        properties: [],
        product_exists: true,
        fulfillable_quantity: fulfillableQty,
        grams: simpleFaker.number.int({ min: 100, max: 1000 }),
        price: price.toFixed(2),
        total_discount: discount.toFixed(2),
        fulfillment_status: null,
        price_set: {
            shop_money: {
                amount: price.toFixed(2),
                currency_code: 'USD',
            },
            presentment_money: {
                amount: price.toFixed(2),
                currency_code: 'USD',
            },
        },
        total_discount_set: {
            shop_money: {
                amount: discount.toFixed(2),
                currency_code: 'USD',
            },
            presentment_money: {
                amount: discount.toFixed(2),
                currency_code: 'USD',
            },
        },
        discount_allocations:
            discount > 0
                ? [
                      {
                          amount: (discount / 2).toFixed(2),
                          discount_application_index: 0,
                          amount_set: {
                              shop_money: {
                                  amount: (discount / 2).toFixed(2),
                                  currency_code: 'USD',
                              },
                              presentment_money: {
                                  amount: (discount / 2).toFixed(2),
                                  currency_code: 'USD',
                              },
                          },
                      },
                      {
                          amount: (discount / 2).toFixed(2),
                          discount_application_index: 2,
                          amount_set: {
                              shop_money: {
                                  amount: (discount / 2).toFixed(2),
                                  currency_code: 'USD',
                              },
                              presentment_money: {
                                  amount: (discount / 2).toFixed(2),
                                  currency_code: 'USD',
                              },
                          },
                      },
                  ]
                : [],
        duties: [],
        admin_graphql_api_id: shopifyLineItemId,
        tax_lines: [],
    };
}

function generateFulfillmentPayload(
    shopifyOrderId: string,
    shopifyFulfillmentId: string,
    lineItems: LineItemPayload[],
    shipmentStatus = 'delivered',
): Payload {
    const tracking = {
        number: simpleFaker.string.alphanumeric(12).toLowerCase(),
        company: `${simpleFaker.string.sample(8)} Shipping`,
    };

    const destination = {
        first_name: simpleFaker.string.sample(6),
        last_name: simpleFaker.string.sample(8),
        address1: `${simpleFaker.number.int({ min: 100, max: 9999 })} ${simpleFaker.string.sample(10)} St`,
        phone: `${simpleFaker.number.int({ min: 100, max: 999 })}-${simpleFaker.number.int({
            min: 100,
            max: 999,
        })}-${simpleFaker.number.int({ min: 1000, max: 9999 })}`,
        city: simpleFaker.string.sample(10),
        zip: simpleFaker.string.numeric(5),
        province: `${simpleFaker.string.sample(8)} State`,
        country: 'United States',
        address2: null,
        company: `${simpleFaker.string.sample(10)} Corp`,
        latitude: null,
        longitude: null,
        country_code: 'US',
        province_code: simpleFaker.string.alpha(2).toUpperCase(),
        name: simpleFaker.string.sample(6),
    };

    const currentDate = new Date().toISOString();

    return {
        id: Number(parseGid(shopifyFulfillmentId)),
        order_id: Number(parseGid(shopifyOrderId)),
        status: 'pending',
        created_at: currentDate,
        service: 'usps',
        updated_at: currentDate,
        tracking_company: tracking.company,
        shipment_status: shipmentStatus,
        location_id: null,
        origin_address: null,
        email: `${simpleFaker.string.sample(8).toLowerCase()}@${simpleFaker.string.sample(6).toLowerCase()}.com`,
        destination: destination,
        line_items: lineItems,
        tracking_number: tracking.number,
        tracking_numbers: [tracking.number],
        tracking_url: `https://www.ups.com/WebTracking?loc=en_US&requester=ST&trackNums=${tracking.number}`,
        tracking_urls: [`https://www.ups.com/WebTracking?loc=en_US&requester=ST&trackNums=${tracking.number}`],
        receipt: {},
        name: `#${simpleFaker.number.int({ min: 1000, max: 9999 })}.1`,
        admin_graphql_api_id: shopifyFulfillmentId,
    };
}

export { generateFulfillmentPayload, generateLineItemPayload };
