import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import { createTestOrderWithEntireFlow, type TestOrderEntireFlow } from '@db/factories/order.factories';
import { simpleFaker } from '@faker-js/faker/.';
import { ROLES } from '@db/constants';
import initializePool from '@db/test-pool';
import { hasPayment, isProcessableFulfillment } from '../../util';

jest.mock('/opt/nodejs/utils', () => ({
    mutateAndValidateGraphQLData: jest.fn(),
}));

jest.mock('../../db.ts', () => ({
    initializePool: initializePool,
}));

jest.mock('../../helper', () => ({
    resyncRetailerFulfillment: jest.fn(),
    cancelRetailerFulfillment: jest.fn(),
    handlePaymentForDeliveredOrder: jest.fn(),
}));

describe('Fulfillments Update Webhook Utility Functions', () => {
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

    describe('isProcessableFulfillment', () => {
        it('should return true if shopifyFullfilmentId is retailerShopifyFulfillmentId and role is retailer', async () => {
            const { client } = database;
            const { fulfillment } = orderEntireFlowDetails;
            const res = await isProcessableFulfillment(
                fulfillment.retailerShopifyFulfillmentId,
                ROLES.RETAILER,
                client,
            );
            expect(res).toBe(true);
        });

        it('should return true if shopifyFullfilmentId is supplierShopifyFulfillmentId and role is supplier', async () => {
            const { client } = database;
            const { fulfillment } = orderEntireFlowDetails;
            const res = await isProcessableFulfillment(
                fulfillment.supplierShopifyFulfillmentId,
                ROLES.SUPPLIER,
                client,
            );
            expect(res).toBe(true);
        });

        it('should return false if role does not match shopifyFulfillmentId', async () => {
            const { client } = database;
            const { fulfillment } = orderEntireFlowDetails;
            const resOne = await isProcessableFulfillment(
                fulfillment.retailerShopifyFulfillmentId,
                ROLES.SUPPLIER,
                client,
            );
            const resTwo = await isProcessableFulfillment(
                fulfillment.supplierShopifyFulfillmentId,
                ROLES.RETAILER,
                client,
            );
            expect(resOne).toBe(false);
            expect(resTwo).toBe(false);
        });

        it('should return false if shopifyFulfillmentId is invalid', async () => {
            const { client } = database;
            const res = await isProcessableFulfillment(nonExistentId, ROLES.SUPPLIER, client);
            expect(res).toBe(false);
        });
    });

    describe('hasPayment', () => {
        it('should return true if payment exists', async () => {
            const { client } = database;
            const { fulfillment } = orderEntireFlowDetails;
            const res = await hasPayment(fulfillment.supplierShopifyFulfillmentId, client);
            expect(res).toBe(true);
        });

        it('should return false if payment does not exists', async () => {
            const { client } = database;
            const res = await hasPayment(nonExistentId, client);
            expect(res).toBe(false);
        });
    });
});
