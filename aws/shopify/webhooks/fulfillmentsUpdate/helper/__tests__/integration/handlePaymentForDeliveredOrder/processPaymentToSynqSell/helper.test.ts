import { simpleFaker } from '@faker-js/faker/.';
import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import {
    createTestOrderWithEntireFlow,
    createTestOrderWithNoPayment,
    type TestOrderEntireFlow,
} from '@db/factories/order.factories';
import db from '@db/test-db';
import {
    paySupplierStripe,
    recordStripePaymentDb,
} from '../../../../handlePaymentForDeliveredOrder/processPaymentToSynqSell/helper';
import { getStripePaymentMethod } from '../../../../../stripe';

jest.mock('/opt/nodejs/utils', () => ({
    ...jest.requireActual('/opt/nodejs/utils'),
    mutateAndValidateGraphQLData: jest.fn(),
    fetchAndValidateGraphQLData: jest.fn(),
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

jest.mock('../../../../../stripe', () => ({
    getStripe: jest.fn(() => Promise.resolve(mockStripe)),
    getStripePaymentMethod: jest.fn(),
}));

describe('processPaymentToSynqSell', () => {
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
});
