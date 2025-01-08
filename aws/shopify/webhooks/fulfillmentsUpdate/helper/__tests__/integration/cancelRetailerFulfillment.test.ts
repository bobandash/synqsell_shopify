import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import { createTestOrderWithEntireFlow, type TestOrderEntireFlow } from '@db/factories/order.factories';
import cancelRetailerFulfillment from '../../cancelRetailerFulfillment';
import { cancelFulfillmentShopify, openFulfillmentShopify } from '../../util';
import db from '@db/test-db';

jest.mock('/opt/nodejs/utils', () => ({
    ...jest.requireActual('/opt/nodejs/utils'),
    mutateAndValidateGraphQLData: jest.fn(),
    fetchAndValidateGraphQLData: jest.fn(),
}));

jest.mock('../../util', () => ({
    cancelFulfillmentShopify: jest.fn(),
    openFulfillmentShopify: jest.fn(),
}));

describe('cancelRetailerFulfillment', () => {
    let orderEntireFlowDetails: TestOrderEntireFlow;
    let database: DatabaseSetup;
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

    it('should cancel equivalent retailer fulfillment if supplier cancelled their tracking', async () => {
        const { fulfillment, retailer } = orderEntireFlowDetails;
        const { client } = database;
        const { supplierShopifyFulfillmentId, retailerShopifyFulfillmentId } = fulfillment;
        await cancelRetailerFulfillment(supplierShopifyFulfillmentId, client);
        const hasFulfillment = (await db.fulfillment.count({ where: { id: fulfillment.id } })) > 0;
        expect(cancelFulfillmentShopify).toHaveBeenCalledTimes(1);
        expect(cancelFulfillmentShopify).toHaveBeenCalledWith(retailer, retailerShopifyFulfillmentId);
        expect(openFulfillmentShopify).toHaveBeenCalledTimes(1);
        expect(openFulfillmentShopify).toHaveBeenCalledWith(retailer, retailerShopifyFulfillmentId);
        expect(hasFulfillment).toBe(false);
    });
});
