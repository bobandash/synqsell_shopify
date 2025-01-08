import { exportsForTesting } from '../../app';
import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import {
    createTestOrderWithEntireFlow,
    generatePayment,
    type TestOrderEntireFlow,
} from '@db/factories/order.factories';
import { simpleFaker } from '@faker-js/faker/.';
import { ROLES } from '@db/constants';

if (!exportsForTesting) {
    throw new Error('Environment is not tests.');
}

jest.mock('/opt/nodejs/utils', () => ({
    mutateAndValidateGraphQLData: jest.fn(),
}));

const { isProcessableFulfillment, hasPayment, lambdaHandler } = exportsForTesting;

describe('markRetailerProductsArchived', () => {
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

// export const lambdaHandler = async (event: ShopifyEvent) => {
//     let client: null | PoolClient = null;
//     const payload = event.detail.payload;
//     const shop = event.detail.metadata['X-Shopify-Shop-Domain'];
//     const webhookId = event.detail.metadata['X-Shopify-Webhook-Id'];
//     const {
//         status: fulfillmentStatus,
//         shipment_status: shipmentStatus,
//         order_id: rawOrderId,
//         admin_graphql_api_id: shopifyFulfillmentId,
//     } = payload;
//     const shopifyOrderId = composeGid('Order', rawOrderId);
//     try {
//         logInfo('Start: Handle fulfillment update for supplier/retailer', {
//             webhookId,
//         });
//         const pool = await initializePool();
//         client = await pool.connect();
//         const [isRetailerFulfillment, isSupplierFulfillment, hasPaymentForFulfillment] = await Promise.all([
//             isProcessableFulfillment(shopifyFulfillmentId, ROLES.RETAILER, client),
//             isProcessableFulfillment(shopifyFulfillmentId, ROLES.SUPPLIER, client),
//             hasPayment(shopifyFulfillmentId, client),
//         ]);

//         if (!isRetailerFulfillment && !isSupplierFulfillment) {
//             logInfo('End: Order is not related to SynqSell.', {
//                 webhookId,
//             });
//             return;
//         }

//         // for handling fulfillment status updates
//         if (fulfillmentStatus === 'cancelled') {
//             if (isRetailerFulfillment) {
//                 await resyncRetailerFulfillment(shopifyFulfillmentId, shop, payload, client);
//             } else if (isSupplierFulfillment) {
//                 await cancelRetailerFulfillment(shopifyFulfillmentId, client);
//             }
//         } else if (shipmentStatus === 'delivered' && isSupplierFulfillment && !hasPaymentForFulfillment) {
//             // for supplier payment
//             await handlePaymentForDeliveredOrder(shop, shopifyOrderId, shopifyFulfillmentId, payload, client);
//         }

//         logInfo('End: Handle fulfillment update for supplier/retailer.', {
//             webhookId,
//         });
//         return;
//     } catch (error) {
//         logError(error, {
//             context: `Failed to handle fulfillment update status.`,
//             webhookId,
//         });
//         throw error;
//     } finally {
//         if (client) {
//             client.release();
//         }
//     }
// };

// export const exportsForTesting =
//     process.env.NODE_ENV === 'test' ? { isProcessableFulfillment, hasPayment, lambdaHandler } : undefined;
