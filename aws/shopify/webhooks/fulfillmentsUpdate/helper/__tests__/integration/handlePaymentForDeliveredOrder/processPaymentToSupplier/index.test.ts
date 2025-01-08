import { exportsForTesting } from '../../../../handlePaymentForDeliveredOrder/processPaymentToSupplier';
import { createTestOrderWithEntireFlow, TestOrderEntireFlow } from '@db/factories/order.factories';
import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';

if (!exportsForTesting) {
    throw new Error('Environment is not tests.');
}

const { getRetailerProfitFromFulfillment, processPaymentToSynqSell } = exportsForTesting;

describe('handlePaymentForDeliveredOrder', () => {
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

    describe('getRetailerProfitFromFulfillment', () => {
        // TODO: add another test for multiple order line items
        it('should calculate total retailer profit based on fulfilled quantities and profit per unit', async () => {
            const { order, orderLineItem } = orderEntireFlowDetails;
            const { client } = database;
            const supplierOrderLineItems = [
                {
                    supplierShopifyOrderLineItemId: orderLineItem.supplierShopifyOrderLineItemId,
                    quantityFulfilled: orderLineItem.quantity,
                },
            ];
            const res = await getRetailerProfitFromFulfillment(order.id, supplierOrderLineItems, client);
            expect(res).toBe(Number(orderLineItem.quantity * Number(orderLineItem.retailerProfitPerUnit)));
        });
    });
});
