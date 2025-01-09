import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import {
    createTestOrderWithEntireFlow,
    createTestOrderWithNoPayment,
    type TestOrderEntireFlow,
} from '@db/factories/order.factories';
import { paySupplierStripe } from '../../../../handlePaymentForDeliveredOrder/processPaymentToSynqSell/helper';
import { generateFulfillmentPayload, generateLineItemPayload } from '~/shopify/webhooks/fulfillmentsUpdate/util.test';
import getOrderDetails from '../../../../handlePaymentForDeliveredOrder/getOrderDetails';
import processPaymentToSupplier from '../../../../handlePaymentForDeliveredOrder/processPaymentToSynqSell';
import db from '@db/test-db';

jest.mock('../../../../handlePaymentForDeliveredOrder/processPaymentToSynqSell/helper', () => ({
    ...jest.requireActual('../../../../handlePaymentForDeliveredOrder/processPaymentToSynqSell/helper'),
    paySupplierStripe: jest.fn(),
}));

paySupplierStripe;

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

    describe('processPaymentToSupplier', () => {
        it('should pay supplier and record payment in database', async () => {
            (paySupplierStripe as jest.Mock).mockResolvedValue('123');
            const { client } = database;
            const { supplier, retailer, priceList, product, variant } = orderEntireFlowDetails;
            const newOrder = await createTestOrderWithNoPayment(retailer.id, supplier.id, priceList.id);
            const orderLineItemPayload = generateLineItemPayload(
                product.shopifyProductId,
                variant.shopifyVariantId,
                newOrder.orderLineItem.supplierShopifyOrderLineItemId,
                newOrder.orderLineItem.quantity,
            );
            const payload = generateFulfillmentPayload(
                newOrder.order.supplierShopifyOrderId,
                newOrder.fulfillment.supplierShopifyFulfillmentId,
                [orderLineItemPayload],
            );
            const data = await getOrderDetails(
                supplier.shop,
                newOrder.order.supplierShopifyOrderId,
                newOrder.fulfillment.supplierShopifyFulfillmentId,
                payload,
                client,
            );

            const numPaymentsBefore = await db.payment.count({});
            await processPaymentToSupplier(data, client);
            const numPaymentsAfter = await db.payment.count({});
            expect(paySupplierStripe).toHaveBeenCalledTimes(1);
            expect(numPaymentsAfter).toBe(numPaymentsBefore + 1);
        });
    });
});
