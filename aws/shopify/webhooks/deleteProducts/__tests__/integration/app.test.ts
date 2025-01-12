import { createTestOrderWithEntireFlow, TestOrderEntireFlow } from '@db/factories/order.factories';
import initializePool, { pool } from '@db/test-pool';
import { lambdaHandler } from '../../app';
import { ShopifyEvent } from '../../types';
import db from '@db/test-db';
import { simpleFaker } from '@faker-js/faker/.';
import { parseGid } from '@shopify/admin-graphql-api-utilities';
import { createTestRole } from '@db/factories/role.factories';
import { ROLES } from '@db/constants';
import { generateImportedProduct } from '@db/factories/pricelist.factories';
import * as helperFunctions from '../../helper';
import * as importedProductModelFunctions from '/opt/nodejs/models/importedProduct';

jest.mock('../../db.ts', () => ({
    initializePool: initializePool,
}));

jest.mock('/opt/nodejs/utils', () => ({
    ...jest.requireActual('/opt/nodejs/utils'),
    mutateAndValidateGraphQLData: jest.fn(),
}));
const handleDeletedSupplierProductSpy = jest.spyOn(helperFunctions, 'handleDeletedSupplierProduct');
const deleteImportedProductSpy = jest.spyOn(importedProductModelFunctions, 'deleteImportedProduct');

describe('Delete Product Shopify Webhook', () => {
    let orderEntireFlowDetails: TestOrderEntireFlow;
    const nonExistentId = simpleFaker.string.uuid();
    const createEvent = (shop: string, productId: string): ShopifyEvent =>
        ({
            detail: {
                metadata: {
                    'X-Shopify-Shop-Domain': shop,
                    'X-Shopify-Webhook-Id': simpleFaker.string.uuid(),
                },
                payload: {
                    id: parseGid(productId),
                },
            },
        } as unknown as ShopifyEvent);
    beforeEach(async () => {
        jest.clearAllMocks();
        orderEntireFlowDetails = await createTestOrderWithEntireFlow();
    });

    afterAll(async () => {
        if (pool) {
            await pool.end();
        }
    });

    describe('Supplier Product', () => {
        it('should remove single retailer imported products and supplier product', async () => {
            const { supplier, product } = orderEntireFlowDetails;
            const supplierEvent = createEvent(supplier.shop, product.shopifyProductId);
            await lambdaHandler(supplierEvent);
            const numImportedProducts = await db.importedProduct.count({});
            const numProducts = await db.product.count({});
            expect(numProducts).toBe(0);
            expect(numImportedProducts).toBe(0);
            expect(handleDeletedSupplierProductSpy).toHaveBeenCalledTimes(1);
            expect(deleteImportedProductSpy).toHaveBeenCalledTimes(0);
        });

        it('should remove all retailer imported products and supplier product', async () => {
            const { supplier, product } = orderEntireFlowDetails;
            const { session: newRetailer } = await createTestRole(ROLES.RETAILER, false);
            await generateImportedProduct(product.id, newRetailer.id);
            const supplierEvent = createEvent(supplier.shop, product.shopifyProductId);
            await lambdaHandler(supplierEvent);
            const numImportedProducts = await db.importedProduct.count({});
            const numProducts = await db.product.count({});
            expect(numProducts).toBe(0);
            expect(numImportedProducts).toBe(0);
            expect(handleDeletedSupplierProductSpy).toHaveBeenCalledTimes(1);
            expect(deleteImportedProductSpy).toHaveBeenCalledTimes(0);
        });
    });

    describe('Retailer Product', () => {
        it('should remove imported product from database', async () => {
            const { importedProduct, retailer } = orderEntireFlowDetails;
            const event = createEvent(retailer.shop, importedProduct.shopifyProductId);
            await lambdaHandler(event);
            const numImportedProducts = await db.importedProduct.count({});
            expect(handleDeletedSupplierProductSpy).toHaveBeenCalledTimes(0);
            expect(deleteImportedProductSpy).toHaveBeenCalledTimes(1);
            expect(numImportedProducts).toBe(0);
        });
    });

    describe('Non-existent Product', () => {
        it('should not delete any products when invalid product is passed', async () => {
            const { retailer } = orderEntireFlowDetails;
            const event = createEvent(retailer.shop, nonExistentId);
            await lambdaHandler(event);
            expect(handleDeletedSupplierProductSpy).toHaveBeenCalledTimes(0);
            expect(deleteImportedProductSpy).toHaveBeenCalledTimes(0);
        });
    });
});
