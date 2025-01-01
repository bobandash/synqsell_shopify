import { createTestOrderWithEntireFlow, TestOrderEntireFlow } from '@db/factories/order.factories';
import initializePool, { pool } from '@db/test-pool';
import { lambdaHandler } from '../../app';
import { ShopifyEvent } from '../../types';
import db from '@db/test-db';
import { simpleFaker } from '@faker-js/faker/.';
import { parseGid } from '@shopify/admin-graphql-api-utilities';
import { createTestRole, generateRole } from '@db/factories/role.factories';
import { ROLES } from '@db/constants';
import { generateImportedProduct } from '@db/factories/pricelist.factories';
import * as helperFunctions from '../../helper';
import * as importedProductModelFunctions from '/opt/nodejs/models/importedProduct';
import { Session, StripeConnectAccount, StripeCustomerAccount } from '@prisma/client';
import { createTestSession } from '@db/factories/session.factories';
import { generateStripeConnectAccount } from '@db/factories/stripeConnectAccount.factories';
import { generateStripeCustomerAccount } from '@db/factories/stripeCustomerAccount.factories';
import { mutateAndValidateGraphQLData } from '/opt/nodejs/utils';
import { DELETE_PRODUCT_MUTATION } from '../../graphql';

jest.mock('../../db.ts', () => ({
    initializePool: initializePool,
}));

jest.mock('/opt/nodejs/utils', () => ({
    mutateAndValidateGraphQLData: jest.fn(),
}));

const mockStripe = {
    accounts: {
        del: jest.fn(),
    },
    customers: {
        del: jest.fn(),
    },
};

jest.mock('../../singletons/stripe', () => ({
    getStripe: jest.fn(() => Promise.resolve(mockStripe)),
}));

describe('Shop Redact Webhook', () => {
    let stripeConnectAccount: StripeConnectAccount;
    let stripeCustomerAccount: StripeCustomerAccount;
    let orderEntireFlowDetails: TestOrderEntireFlow;
    const nonExistentId = simpleFaker.string.uuid();
    const createEvent = (shop: string): ShopifyEvent =>
        ({
            detail: {
                metadata: {
                    'X-Shopify-Shop-Domain': shop,
                    'X-Shopify-Webhook-Id': simpleFaker.string.uuid(),
                },
            },
        } as unknown as ShopifyEvent);

    beforeEach(async () => {
        jest.clearAllMocks();
        orderEntireFlowDetails = await createTestOrderWithEntireFlow();
        const { supplier, retailer } = orderEntireFlowDetails;
        stripeConnectAccount = await generateStripeConnectAccount(supplier.id);
        stripeCustomerAccount = await generateStripeCustomerAccount(retailer.id, true);
    });

    afterAll(async () => {
        if (pool) {
            await pool.end();
        }
    });

    it('should successfully delete all shop data for supplier', async () => {
        const { supplier, retailer, importedProduct } = orderEntireFlowDetails;
        const event = createEvent(supplier.shop);
        await lambdaHandler(event);
        const sessionCnt = await db.session.count({ where: { id: supplier.id } });
        // should delete stripe connect integration
        expect(mockStripe.accounts.del).toHaveBeenCalledTimes(1);
        expect(mockStripe.customers.del).toHaveBeenCalledTimes(0);
        // should delete session
        expect(sessionCnt).toBe(0);
        // should delete product on retailer's store
        (mutateAndValidateGraphQLData as jest.Mock).mockResolvedValue({});
        expect(mutateAndValidateGraphQLData).toHaveBeenCalledWith(
            retailer.shop,
            retailer.accessToken,
            DELETE_PRODUCT_MUTATION,
            {
                id: importedProduct.shopifyProductId,
            },
            `Failed to delete product for retailer.`,
        );
    });

    it('should successfully delete all shop data for retailer', async () => {
        const { retailer } = orderEntireFlowDetails;
        const event = createEvent(retailer.shop);
        await lambdaHandler(event);
        const sessionCnt = await db.session.count({ where: { id: retailer.id } });
        // should delete stripe payment account
        expect(mockStripe.accounts.del).toHaveBeenCalledTimes(0);
        expect(mockStripe.customers.del).toHaveBeenCalledTimes(1);
        // should delete session
        expect(sessionCnt).toBe(0);
        // retailer has no imported products
        (mutateAndValidateGraphQLData as jest.Mock).mockResolvedValue({});
        expect(mutateAndValidateGraphQLData).toHaveBeenCalledTimes(0);
    });

    it('should successfully delete all shop data for user that is both supplier and retailer', async () => {
        const { retailer } = orderEntireFlowDetails;
        await generateRole(retailer.id, ROLES.SUPPLIER);
        await generateStripeConnectAccount(retailer.id);
        const event = createEvent(retailer.shop);
        await lambdaHandler(event);
        const sessionCnt = await db.session.count({ where: { id: retailer.id } });
        // should delete stripe payment account
        expect(mockStripe.accounts.del).toHaveBeenCalledTimes(1);
        expect(mockStripe.customers.del).toHaveBeenCalledTimes(1);
        // should delete session
        expect(sessionCnt).toBe(0);
        // retailer currently has no products other stores imported
        (mutateAndValidateGraphQLData as jest.Mock).mockResolvedValue({});
        expect(mutateAndValidateGraphQLData).toHaveBeenCalledTimes(0);
    });

    it('should throw error if invalid session', async () => {
        const event = createEvent(nonExistentId);
        await expect(lambdaHandler(event)).rejects.toThrow();
    });
});
