import { simpleFaker } from '@faker-js/faker/.';
import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import {
    createTestOrderWithEntireFlow,
    createTestOrderWithNoPayment,
    generateFulfillment,
    generateOrder,
    generateOrderLineItem,
    type TestOrderEntireFlow,
} from '@db/factories/order.factories';
import { exportsForTesting } from '../../../handlePaymentForDeliveredOrder/helper';
import { getStripePaymentMethod } from '../../../../stripe';
import db from '@db/test-db';
import { generateFulfillmentPayload, generateLineItemPayload } from '~/shopify/webhooks/fulfillmentsUpdate/util.test';
import { createUsageChargeShopify } from '../../../handlePaymentForDeliveredOrder/graphql';
import { SYNQSELL_COMMISSION } from '~/shopify/webhooks/fulfillmentsUpdate/constants';

if (!exportsForTesting) {
    throw new Error('Environment is not tests.');
}

jest.mock('/opt/nodejs/utils', () => ({
    ...jest.requireActual('/opt/nodejs/utils'),
    mutateAndValidateGraphQLData: jest.fn(),
    fetchAndValidateGraphQLData: jest.fn(),
}));

jest.mock('../../../handlePaymentForDeliveredOrder/graphql', () => ({
    createUsageChargeShopify: jest.fn(),
}));

const mockStripe = {
    accounts: {
        del: jest.fn(),
    },
    customers: {
        del: jest.fn(),
    },
    paymentMethods: {
        list: jest.fn(),
    },
    paymentIntents: {
        create: jest.fn(() => Promise.resolve({ id: 1 })),
    },
};

jest.mock('../../../../stripe', () => ({
    getStripe: jest.fn(() => Promise.resolve(mockStripe)),
    getStripePaymentMethod: jest.fn(),
}));

const {
    getRetailerSessionFromFulfillmentId,
    getOrderTotalQuantity,
    getShippingTotalPaidToDate,
    getShippingPayable,
    getOrderPayable,
    getOrderDetails,
    paySupplierStripe,
    recordStripePaymentDb,
    processPaymentToSupplier,
    getRetailerProfitFromFulfillment,
    getShopifySubscriptionLineItemId,
    recordBillingTransactionDb,
    handleShopifyUsageCharge,
    processPaymentToSynqSell,
} = exportsForTesting;

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

    describe('getRetailerSessionFromFulfillmentId', () => {
        it('should return retailer session', async () => {
            const { retailer, fulfillment } = orderEntireFlowDetails;
            const { client } = database;
            const res = await getRetailerSessionFromFulfillmentId(fulfillment.id, client);
            expect(res).toEqual(retailer);
        });

        it('should throw error if fulfillment id does not exist', async () => {
            const { client } = database;
            await expect(getRetailerSessionFromFulfillmentId(nonExistentId, client)).rejects.toThrow();
        });
    });

    describe('getOrderTotalQuantity', () => {
        it('should return number of items in order', async () => {
            const { order, orderLineItem } = orderEntireFlowDetails;
            const { client } = database;
            const res = await getOrderTotalQuantity(order.id, client);
            expect(res).toBe(orderLineItem.quantity);
        });

        it('should throw error if order does not exist', async () => {
            const { client } = database;
            await expect(getOrderTotalQuantity(nonExistentId, client)).rejects.toThrow();
        });
    });

    describe('getShippingTotalPaidToDate', () => {
        it('should return the amount the shipping the retailer paid the supplier to date for specific order', async () => {
            const { client } = database;
            const { payment, order } = orderEntireFlowDetails;
            const res = await getShippingTotalPaidToDate(order.id, client);
            expect(res).toEqual(Number(payment.shippingPaid));
        });

        it('should throw error if order is not valid', async () => {
            const { client } = database;
            await expect(getShippingTotalPaidToDate(nonExistentId, client)).rejects.toThrow();
        });
    });

    describe('getShippingPayable', () => {
        it('should return the entire shipping amount if the entire order is fulfilled', async () => {
            const { retailer, supplier, priceList } = orderEntireFlowDetails;
            const newShippingCost = 25;
            const totalOrderQty = 2;
            const fulfilledQty = 2;
            // need to create an entirely new order with different quantities
            const newOrder = await db.$transaction(async (tx) => {
                const order = await generateOrder(
                    retailer.id,
                    supplier.id,
                    {
                        shippingCost: newShippingCost,
                    },
                    tx,
                );
                const orderLineItem = await generateOrderLineItem(
                    order.id,
                    priceList.id,
                    {
                        quantity: totalOrderQty,
                    },
                    tx,
                );
                const fulfillment = await generateFulfillment(order.id, {}, tx);
                return {
                    order,
                    orderLineItem,
                    fulfillment,
                };
            });

            const { client } = database;
            const res = await getShippingPayable(newOrder.order.id, newShippingCost, fulfilledQty, client);
            expect(res).toBe(newShippingCost);
        });

        it('should return a fraction of shipping amount if the order is partially fulfilled', async () => {
            const { retailer, supplier, priceList } = orderEntireFlowDetails;
            const newShippingCost = 25;
            const totalOrderQty = 2;
            const fulfilledQty = 1;
            const targetShippingPayable = 12.5;
            // need to create an entirely new order with different quantities
            const newOrder = await db.$transaction(async (tx) => {
                const order = await generateOrder(
                    retailer.id,
                    supplier.id,
                    {
                        shippingCost: newShippingCost,
                    },
                    tx,
                );
                const orderLineItem = await generateOrderLineItem(
                    order.id,
                    priceList.id,
                    {
                        quantity: totalOrderQty,
                    },
                    tx,
                );
                const fulfillment = await generateFulfillment(order.id, {}, tx);
                return {
                    order,
                    orderLineItem,
                    fulfillment,
                };
            });

            const { client } = database;
            const res = await getShippingPayable(newOrder.order.id, newShippingCost, fulfilledQty, client);
            expect(res).toBe(targetShippingPayable);
        });
    });

    describe('paySupplierStripe', () => {
        it(`should pay supplier's stripe connect account from retailer's stripe payments account`, async () => {
            const { client } = database;
            const { supplier, retailer, retailerStripeCustomerAccount, supplierStripeConnectAccount } =
                orderEntireFlowDetails;
            const payableAmt = 24.99;
            const stripeCurrency = 'usd';
            const paymentMethod = 'pm_1NO6mA2eZvKYlo2CEydeHsKT';
            (getStripePaymentMethod as jest.Mock).mockResolvedValue(paymentMethod);
            await paySupplierStripe(supplier.id, retailer.id, payableAmt, stripeCurrency, client);
            expect(getStripePaymentMethod).toHaveBeenCalledWith(retailerStripeCustomerAccount.stripeCustomerId);
            expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
                amount: payableAmt,
                currency: stripeCurrency,
                off_session: true,
                confirm: true,
                customer: retailerStripeCustomerAccount.stripeCustomerId,
                payment_method: paymentMethod,
                transfer_data: {
                    destination: supplierStripeConnectAccount.stripeAccountId,
                },
            });
        });
    });

    describe('getOrderPayable', () => {
        it('should return the amount the retailer has to pay the supplier for the order (excluding shipping)', async () => {
            const { order, orderLineItem } = orderEntireFlowDetails;
            const { client } = database;
            const supplierOrderLineItems = [
                {
                    supplierShopifyOrderLineItemId: orderLineItem.supplierShopifyOrderLineItemId,
                    quantityFulfilled: orderLineItem.quantity,
                },
            ];
            const orderPayable = await getOrderPayable(order.id, supplierOrderLineItems, client);
            const expected = orderLineItem.quantity * Number(orderLineItem.supplierProfitPerUnit);
            expect(orderPayable).toBe(expected);
        });
    });

    describe('getOrderDetails', () => {
        it('should return all relevant order details necessary to handle stripe + shopify billing api payments', async () => {
            const { client } = database;
            const { supplier, fulfillment, order, product, variant, orderLineItem, retailer } = orderEntireFlowDetails;
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
            const orderDetails = await getOrderDetails(
                supplier.shop,
                order.supplierShopifyOrderId,
                fulfillment.supplierShopifyFulfillmentId,
                payload,
                client,
            );
            expect(orderDetails).toMatchObject({
                orderLineItems: [
                    expect.objectContaining({
                        supplierShopifyOrderLineItemId: orderLineItem.supplierShopifyOrderLineItemId,
                        quantityFulfilled: orderLineItem.quantity,
                    }),
                ],
                dbFulfillmentId: fulfillment.id,
                supplierSession: expect.objectContaining({
                    shop: supplier.shop,
                }),
                retailerSession: expect.objectContaining({
                    shop: retailer.shop,
                }),
                orderDetails: {
                    ...order,
                    createdAt: expect.any(Date),
                    updatedAt: expect.any(Date),
                    shippingCost: Number(order.shippingCost).toFixed(2),
                },
            });
            expect(orderDetails).toHaveProperty(
                'payments',
                expect.objectContaining({
                    shippingPayable: expect.any(Number),
                    orderPayable: expect.any(Number),
                    totalPayable: expect.any(Number),
                }),
            );

            expect(orderDetails).toHaveProperty(
                'currency',
                expect.objectContaining({
                    original: expect.any(String),
                    stripeCurrency: expect.any(String),
                    shopifyCurrency: expect.any(String),
                }),
            );
        });
    });

    describe('recordStripePaymentDb', () => {
        it('should throw error if payment already exists for associated fulfillment', async () => {
            const { fulfillment, order } = orderEntireFlowDetails;
            const { client } = database;
            await expect(
                recordStripePaymentDb(simpleFaker.string.uuid(), 24.99, 6, 30.99, fulfillment.id, order.id, client),
            ).rejects.toThrow();
        });

        it('should create payment in database if payment does not exist for order', async () => {
            const { retailer, supplier, priceList } = orderEntireFlowDetails;
            const newOrder = await createTestOrderWithNoPayment(retailer.id, supplier.id, priceList.id);
            const { client } = database;
            const paymentId = await recordStripePaymentDb(
                simpleFaker.string.uuid(),
                24.99,
                6,
                30.99,
                newOrder.fulfillment.id,
                newOrder.order.id,
                client,
            );
            const paymentExists = (await db.payment.count({ where: { id: paymentId } })) > 0;
            expect(paymentExists).toBe(true);
        });
    });

    describe('getRetailerProfitFromFulfillment', () => {
        // TODO: add more tests for multiple order line items
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
