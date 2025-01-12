import { simpleFaker } from '@faker-js/faker/.';
import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import { createTestOrderWithEntireFlow, type TestOrderEntireFlow } from '@db/factories/order.factories';
import { exportsForTesting } from '../../../../handlePaymentForDeliveredOrder/processPaymentToSupplier/helper';
import db from '@db/test-db';
import { createUsageChargeShopify } from '../../../../handlePaymentForDeliveredOrder/graphql';
import { SYNQSELL_COMMISSION } from '~/shopify/webhooks/fulfillmentsUpdate/constants';

// TODO: add module import alias

if (!exportsForTesting) {
    throw new Error('Environment is not tests.');
}

jest.mock('../../../../handlePaymentForDeliveredOrder/graphql', () => ({
    createUsageChargeShopify: jest.fn(),
}));

const { getShopifySubscriptionLineItemId, recordBillingTransactionDb, handleShopifyUsageCharge } = exportsForTesting;

describe('handlePaymentForDeliveredOrder', () => {
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

    describe('getShopifySubscriptionLineItemId', () => {
        it('should return shopifySubscriptionLineItemId', async () => {
            const { retailer, retailerBilling } = orderEntireFlowDetails;
            const { client } = database;
            const res = await getShopifySubscriptionLineItemId(retailer.id, client);
            expect(res).toBe(retailerBilling.shopifySubscriptionLineItemId);
        });

        it('should throw error if shopifySubscriptionLineItemId does not exist', async () => {
            const { client } = database;
            await expect(getShopifySubscriptionLineItemId(nonExistentId, client)).rejects.toThrow();
        });
    });

    describe('recordBillingTransactionDb', () => {
        it('should add billing transaction to database', async () => {
            const { payment, retailer } = orderEntireFlowDetails;
            const { client } = database;
            const shopifyUsageRecordId = simpleFaker.string.uuid();
            const amtPaid = 2.2;
            const shopifyCurrency = 'USD';
            const cntBefore = await db.billingTransaction.count({});
            await recordBillingTransactionDb(
                payment.id,
                retailer.id,
                shopifyUsageRecordId,
                amtPaid,
                shopifyCurrency,
                client,
            );
            const cntAfter = await db.billingTransaction.count({});
            expect(cntAfter).toBe(cntBefore + 1);
        });
    });

    describe('handleShopifyUsageCharge', () => {
        it('should charge retailer properly on Shopify and add transaction to db', async () => {
            (createUsageChargeShopify as jest.Mock).mockResolvedValue('123');
            const { payment, order, retailer, retailerBilling } = orderEntireFlowDetails;
            const { client } = database;
            const profit = 25;
            const amtToCharge = Number((profit * SYNQSELL_COMMISSION).toFixed(2));
            const numBillingTransactionBefore = await db.billingTransaction.count({});
            await handleShopifyUsageCharge(payment.id, order.currency, 25, retailer, client);
            const numBillingTransactionAfter = await db.billingTransaction.count({});
            expect(createUsageChargeShopify).toHaveBeenCalledWith(
                retailerBilling.shopifySubscriptionLineItemId,
                amtToCharge,
                order.currency,
                retailer,
            );
            expect(numBillingTransactionAfter).toBe(numBillingTransactionBefore + 1);
        });

        it('should charge supplier properly on Shopify and add transaction to db', async () => {
            (createUsageChargeShopify as jest.Mock).mockResolvedValue('123');

            const { payment, order, supplier, supplierBilling } = orderEntireFlowDetails;
            const { client } = database;
            const profit = 25;
            const amtToCharge = Number((profit * SYNQSELL_COMMISSION).toFixed(2));
            const numBillingTransactionBefore = await db.billingTransaction.count({});
            await handleShopifyUsageCharge(payment.id, order.currency, 25, supplier, client);
            const numBillingTransactionAfter = await db.billingTransaction.count({});
            expect(createUsageChargeShopify).toHaveBeenCalledWith(
                supplierBilling.shopifySubscriptionLineItemId,
                amtToCharge,
                order.currency,
                supplier,
            );
            expect(numBillingTransactionAfter).toBe(numBillingTransactionBefore + 1);
        });
    });
});
