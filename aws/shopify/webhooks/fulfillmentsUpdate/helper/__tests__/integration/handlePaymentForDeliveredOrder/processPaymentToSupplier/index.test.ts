import { exportsForTesting } from '../../../../handlePaymentForDeliveredOrder/processPaymentToSupplier';
import { createTestOrderWithEntireFlow, TestOrderEntireFlow } from '@db/factories/order.factories';
import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import getOrderDetails from '../../../../handlePaymentForDeliveredOrder/getOrderDetails';
import { generateFulfillmentPayload, generateLineItemPayload } from '~/shopify/webhooks/fulfillmentsUpdate/common.test';
import handleShopifyUsageCharge from '../../../../handlePaymentForDeliveredOrder/processPaymentToSupplier/helper';

if (!exportsForTesting) {
    throw new Error('Environment is not tests.');
}

const { getRetailerProfitFromFulfillment, processPaymentToSynqSell } = exportsForTesting;

jest.mock('../../../../handlePaymentForDeliveredOrder/processPaymentToSupplier/helper', () => ({
    __esModule: true,
    default: jest.fn(),
}));

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

    describe('processPaymentToSynqSell', () => {
        it('should charge both the retailer and supplier for usage charges', async () => {
            const { client } = database;
            const { supplier, fulfillment, order, product, variant, orderLineItem, payment } = orderEntireFlowDetails;
            const orderLineItemPayload = generateLineItemPayload(
                product.shopifyProductId,
                variant.shopifyVariantId,
                orderLineItem.supplierShopifyOrderLineItemId,
                orderLineItem.quantity,
            );
            const payload = generateFulfillmentPayload(
                order.supplierShopifyOrderId,
                fulfillment.supplierShopifyFulfillmentId,
                [orderLineItemPayload],
            );
            const data = await getOrderDetails(
                supplier.shop,
                order.supplierShopifyOrderId,
                fulfillment.supplierShopifyFulfillmentId,
                payload,
                client,
            );
            await processPaymentToSynqSell(data, payment.id, client);

            expect(handleShopifyUsageCharge).toHaveBeenCalledWith(
                payment.id,
                data.currency.shopifyCurrency,
                expect.any(Number),
                data.retailerSession,
                client,
            );

            expect(handleShopifyUsageCharge).toHaveBeenCalledWith(
                payment.id,
                data.currency.shopifyCurrency,
                expect.any(Number),
                data.supplierSession,
                client,
            );
            expect(handleShopifyUsageCharge).toHaveBeenCalledTimes(2);
        });
    });
});
