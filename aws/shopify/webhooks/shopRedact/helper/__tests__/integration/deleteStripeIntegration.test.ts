import { simpleFaker } from '@faker-js/faker/.';
import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import { createTestSession } from '@db/factories/session.factories';
import { Session, StripeConnectAccount, StripeCustomerAccount } from '@prisma/client';
import { generateStripeConnectAccount } from '@db/factories/stripeConnectAccount.factories';
import { generateStripeCustomerAccount } from '@db/factories/stripeCustomerAccount.factories';
import { getStripe } from '../../../singletons/stripe';
import { exportsForTesting } from '../../deleteStripeIntegrations';
import { deleteBilling } from '~/util-layer/models/billing';
import db from '@db/test-db';

if (!exportsForTesting) {
    throw new Error('Environment is not test');
}

const { deleteStripeConnectAccount, deleteStripeCustomerAccount, deleteStripeIntegrations } = exportsForTesting;

const mockStripe = {
    accounts: {
        del: jest.fn(),
    },
    customers: {
        del: jest.fn(),
    },
};

jest.mock('../../../singletons/stripe', () => ({
    getStripe: jest.fn(() => Promise.resolve(mockStripe)),
}));

describe('deleteStripeIntegrations', () => {
    let session: Session;
    let stripeConnectAccount: StripeConnectAccount;
    let stripeCustomerAccount: StripeCustomerAccount;
    let database: DatabaseSetup;
    const nonExistentId = simpleFaker.string.uuid();
    beforeEach(async () => {
        jest.clearAllMocks();
        database = await setupDatabase();
        session = await createTestSession();
        stripeConnectAccount = await generateStripeConnectAccount(session.id);
        stripeCustomerAccount = await generateStripeCustomerAccount(session.id, true);
    });

    afterEach(() => {
        disconnectClient(database.client);
    });

    afterAll(async () => {
        teardownPool(database.pool);
    });

    describe('deleteStripeConnectAccount', () => {
        it('should successfully call delete on stripe connect account', async () => {
            const { client } = database;
            await deleteStripeConnectAccount(session.id, client);
            expect(mockStripe.accounts.del).toHaveBeenCalledTimes(1);
            expect(mockStripe.accounts.del).toHaveBeenCalledWith(stripeConnectAccount.stripeAccountId);
        });

        it('should throw error if user does not have a stripe connect account', async () => {
            const { client } = database;
            await expect(deleteStripeConnectAccount(nonExistentId, client)).rejects.toThrow();
        });
    });

    describe('deleteStripeCustomerAccount', () => {
        it('should successfully call delete on stripe customer account', async () => {
            const { client } = database;
            await deleteStripeCustomerAccount(session.id, client);
            expect(mockStripe.customers.del).toHaveBeenCalledTimes(1);
            expect(mockStripe.customers.del).toHaveBeenCalledWith(stripeCustomerAccount.stripeCustomerId);
        });

        it('should throw error if user does not have a stripe customer account', async () => {
            const { client } = database;
            await expect(deleteStripeConnectAccount(nonExistentId, client)).rejects.toThrow();
        });
    });

    describe('deleteStripeIntegrations', () => {
        it('should call delete on stripe connect and customer account if user has both', async () => {
            const { client } = database;
            await deleteStripeIntegrations(session.id, client);
            expect(mockStripe.customers.del).toHaveBeenCalledTimes(1);
            expect(mockStripe.accounts.del).toHaveBeenCalledTimes(1);
        });

        it('should call delete on stripe connect account if only that exists', async () => {
            const { client } = database;
            await db.stripeCustomerAccount.delete({
                where: {
                    retailerId: session.id,
                },
            });
            await deleteStripeIntegrations(session.id, client);
            expect(mockStripe.accounts.del).toHaveBeenCalledTimes(1);
            expect(mockStripe.customers.del).toHaveBeenCalledTimes(0);
        });

        it('should call delete on stripe customer account if only that exists', async () => {
            const { client } = database;
            await db.stripeConnectAccount.delete({
                where: {
                    supplierId: session.id,
                },
            });
            await deleteStripeIntegrations(session.id, client);
            expect(mockStripe.accounts.del).toHaveBeenCalledTimes(0);
            expect(mockStripe.customers.del).toHaveBeenCalledTimes(1);
        });

        it('should call delete on neither stripe customer account or connect account if they both do not exist', async () => {
            const { client } = database;
            await deleteStripeIntegrations(nonExistentId, client);
            expect(mockStripe.accounts.del).toHaveBeenCalledTimes(0);
            expect(mockStripe.customers.del).toHaveBeenCalledTimes(0);
        });
    });
});
