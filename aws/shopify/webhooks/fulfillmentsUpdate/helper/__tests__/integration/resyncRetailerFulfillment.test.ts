import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import { createTestOrderWithEntireFlow, type TestOrderEntireFlow } from '@db/factories/order.factories';
import { createFulfillmentShopify } from '../../util';
import db from '@db/test-db';
import { exportsForTesting } from '../../resyncRetailerFulfillment';
import { simpleFaker } from '@faker-js/faker/.';
import { createLineItem, createSamplePayload } from '../utils';
import { parseGid } from '@shopify/admin-graphql-api-utilities';

jest.mock('/opt/nodejs/utils', () => ({
    ...jest.requireActual('/opt/nodejs/utils'),
    mutateAndValidateGraphQLData: jest.fn(),
    fetchAndValidateGraphQLData: jest.fn(),
}));

jest.mock('../../util', () => ({
    cancelFulfillmentShopify: jest.fn(),
    openFulfillmentShopify: jest.fn(),
    createFulfillmentShopify: jest.fn(),
}));

if (!exportsForTesting) {
    throw new Error('Environment is invalid.');
}

const {
    getRetailerShopifyFulfillmentOrderId,
    createFulfillmentInput,
    updateRetailerShopifyFulfillmentIdDb,
    resyncRetailerFulfillment,
} = exportsForTesting;

describe('resyncRetailerFulfillment', () => {
    let orderEntireFlowDetails: TestOrderEntireFlow;
    let database: DatabaseSetup;
    const nonExistentId = simpleFaker.string.uuid();
    beforeEach(async () => {
        jest.clearAllMocks();
        database = await setupDatabase();
        orderEntireFlowDetails = await createTestOrderWithEntireFlow();
    });

    afterEach(() => {
        disconnectClient(database.client);
    });

    afterAll(async () => {
        await teardownPool(database.pool);
    });

    describe('getRetailerShopifyFulfillmentOrderId', () => {
        it(`should return order's retailerShopifyFulfillmentOrderId given fulfillment id`, async () => {
            const { fulfillment, order } = orderEntireFlowDetails;
            const { client } = database;
            const res = await getRetailerShopifyFulfillmentOrderId(fulfillment.id, client);
            expect(res).toBe(order.retailerShopifyFulfillmentOrderId);
        });

        it('should throw error if fulfillment id does not exist', async () => {
            const { client } = database;
            await expect(getRetailerShopifyFulfillmentOrderId(nonExistentId, client)).rejects.toThrow();
        });
    });

    describe('createFulfillmentInput', () => {
        it('should return fulfillment input needed to create fulfillment for retailer', () => {
            const { orderLineItem, order, importedProduct, importedVariant, fulfillment } = orderEntireFlowDetails;
            const rawShopifyProductId = parseGid(importedProduct.shopifyProductId) as unknown as number;
            const rawShopifyVariantId = parseGid(importedVariant.shopifyVariantId) as unknown as number;
            const lineItem = createLineItem(
                rawShopifyProductId,
                rawShopifyVariantId,
                orderLineItem.retailerShopifyOrderLineItemId,
            );
            // note: we do not need to pass in order id for fulfillment order because the retailer should automatically separate the values
            const payload = createSamplePayload(0, fulfillment.retailerShopifyFulfillmentId, [lineItem]);
            const res = createFulfillmentInput(payload, order.retailerShopifyFulfillmentOrderId);
            const expectedResult = {
                trackingInfo: {
                    company: payload.tracking_company,
                    numbers: payload.tracking_numbers,
                    urls: payload.tracking_urls,
                },
                lineItemsByFulfillmentOrder: {
                    fulfillmentOrderId: order.retailerShopifyFulfillmentOrderId,
                    fulfillmentOrderLineItems: [
                        {
                            id: lineItem.admin_graphql_api_id,
                            quantity: lineItem.quantity,
                        },
                    ],
                },
            };
            expect(res).toEqual(expectedResult);
        });
    });

    describe('updateRetailerShopifyFulfillmentIdDb', () => {
        it('should update retailer shopify fulfillment id with new value', async () => {
            const { client } = database;
            const { fulfillment } = orderEntireFlowDetails;
            const randId = simpleFaker.string.uuid();
            await updateRetailerShopifyFulfillmentIdDb(fulfillment.id, randId, client);
            const query = await db.fulfillment.findFirstOrThrow({
                where: {
                    id: fulfillment.id,
                },
            });
            expect(query.retailerShopifyFulfillmentId).toBe(randId);
        });
    });

    describe('resyncRetailerFulfillment', () => {
        it('should create fulfillment in Shopify and update retailerShopifyfulfillmentId in database', async () => {
            const { client } = database;
            const { fulfillment, retailer, importedProduct, importedVariant, orderLineItem } = orderEntireFlowDetails;
            const rawShopifyProductId = parseGid(importedProduct.shopifyProductId) as unknown as number;
            const rawShopifyVariantId = parseGid(importedVariant.shopifyVariantId) as unknown as number;
            const lineItem = createLineItem(
                rawShopifyProductId,
                rawShopifyVariantId,
                orderLineItem.retailerShopifyOrderLineItemId,
            );
            // note: we do not need to pass in order id for fulfillment order because the retailer should automatically separate the values
            const payload = createSamplePayload(0, fulfillment.retailerShopifyFulfillmentId, [lineItem]);
            const newRetailerShopifyFulfillmentId = 'gid://shopify/Fulfillment/123';
            (createFulfillmentShopify as jest.Mock).mockResolvedValueOnce(newRetailerShopifyFulfillmentId);
            await resyncRetailerFulfillment(fulfillment.retailerShopifyFulfillmentId, retailer.shop, payload, client);
            const query = await db.fulfillment.findFirstOrThrow({
                where: {
                    id: fulfillment.id,
                },
            });
            expect(createFulfillmentShopify).toHaveBeenCalledTimes(1);
            expect(query.retailerShopifyFulfillmentId).toBe(newRetailerShopifyFulfillmentId);
        });
    });
});
