import { createTestOrderWithEntireFlow, TestOrderEntireFlow } from '@db/factories/order.factories';
import { simpleFaker } from '@faker-js/faker/.';
import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import handleDeletedSupplierProduct, { exportsForTesting } from '../../handleDeletedSupplierProduct';
import { createTestRole } from '@db/factories/role.factories';
import { ROLES } from '@db/constants';
import { generateImportedProduct } from '@db/factories/pricelist.factories';
import { mutateAndValidateGraphQLData } from '~/util-layer/utils';
import { DELETE_PRODUCT_MUTATION } from '../../../graphql';
import db from '@db/test-db';

if (!exportsForTesting) {
    throw new Error('Environment is not test environment');
}

jest.mock('/opt/nodejs/utils', () => ({
    mutateAndValidateGraphQLData: jest.fn(),
}));

const { getAllRetailerProducts, deleteImportedProductsShopify } = exportsForTesting;

describe('handleDeletedSupplierProduct', () => {
    let orderEntireFlowDetails: TestOrderEntireFlow;
    let database: DatabaseSetup;
    const nonExistentId = simpleFaker.string.uuid();
    beforeEach(async () => {
        jest.clearAllMocks();
        database = await setupDatabase();
        orderEntireFlowDetails = await createTestOrderWithEntireFlow();
    });

    afterEach(async () => {
        disconnectClient(database.client);
    });

    afterAll(async () => {
        teardownPool(database.pool);
    });

    describe('getAllRetailerProducts', () => {
        it('should return single retailer product', async () => {
            const { client } = database;
            const { product, importedProduct, retailer } = orderEntireFlowDetails;
            const res = await getAllRetailerProducts(product.shopifyProductId, client);
            expect(res).toEqual([
                {
                    retailerShopifyProductId: importedProduct.shopifyProductId,
                    retailerShop: retailer.shop,
                    retailerAccessToken: retailer.accessToken,
                },
            ]);
        });

        it('should return multiple retailer products', async () => {
            const { client } = database;
            const { product, importedProduct, retailer } = orderEntireFlowDetails;
            const { session: newRetailer } = await createTestRole(ROLES.RETAILER, false);
            const newImportedProduct = await generateImportedProduct(product.id, newRetailer.id);

            const res = await getAllRetailerProducts(product.shopifyProductId, client);
            expect(res).toHaveLength(2);
            expect(res).toEqual([
                {
                    retailerShopifyProductId: importedProduct.shopifyProductId,
                    retailerShop: retailer.shop,
                    retailerAccessToken: retailer.accessToken,
                },
                {
                    retailerShopifyProductId: newImportedProduct.shopifyProductId,
                    retailerShop: newRetailer.shop,
                    retailerAccessToken: newRetailer.accessToken,
                },
            ]);
        });

        it('should return empty array if no products', async () => {
            const { client } = database;
            const res = await getAllRetailerProducts(nonExistentId, client);
            expect(res).toHaveLength(0);
        });
    });

    describe('deleteImportedProductsShopify', () => {
        it('should call the Shopify mutation query with valid parameters properly', async () => {
            const { retailer, product, importedProduct } = orderEntireFlowDetails;
            const { client } = database;
            (mutateAndValidateGraphQLData as jest.Mock).mockResolvedValue({});
            await deleteImportedProductsShopify(product.shopifyProductId, client);
            expect(mutateAndValidateGraphQLData).toHaveBeenCalledTimes(1);
            expect(mutateAndValidateGraphQLData).toHaveBeenCalledWith(
                retailer.shop,
                retailer.accessToken,
                DELETE_PRODUCT_MUTATION,
                {
                    id: importedProduct.shopifyProductId,
                },
                'Could not delete product for retailer.',
            );
        });

        it('should call the Shopify mutation query for all imported products', async () => {
            const { product } = orderEntireFlowDetails;
            const { client } = database;
            const { session: newRetailer } = await createTestRole(ROLES.RETAILER, false);
            await generateImportedProduct(product.id, newRetailer.id);
            (mutateAndValidateGraphQLData as jest.Mock).mockResolvedValue({});
            await deleteImportedProductsShopify(product.shopifyProductId, client);
            expect(mutateAndValidateGraphQLData).toHaveBeenCalledTimes(2);
        });

        it('should call the Shopify mutation query 0 times if no imported products exist', async () => {
            const { client } = database;
            (mutateAndValidateGraphQLData as jest.Mock).mockResolvedValue({});
            await deleteImportedProductsShopify(nonExistentId, client);
            expect(mutateAndValidateGraphQLData).toHaveBeenCalledTimes(0);
        });
    });

    describe('handleDeletedSupplierProduct', () => {
        it('should delete imported products and product from database', async () => {
            const { client } = database;
            const { product, importedProduct } = orderEntireFlowDetails;
            (mutateAndValidateGraphQLData as jest.Mock).mockResolvedValue({});
            await handleDeletedSupplierProduct(product.shopifyProductId, client);
            const productExists = (await db.product.count({ where: { id: product.id } })) > 0;
            const importedProductExists = (await db.importedProduct.count({ where: { id: importedProduct.id } })) > 0;
            expect(productExists).toBe(false);
            expect(importedProductExists).toBe(false);
        });

        it('should not delete products if product id is not supplier shopify product id', async () => {
            const { client } = database;
            const { product, importedProduct } = orderEntireFlowDetails;
            (mutateAndValidateGraphQLData as jest.Mock).mockResolvedValue({});
            await handleDeletedSupplierProduct(importedProduct.shopifyProductId, client);
            const productExists = (await db.product.count({ where: { id: product.id } })) > 0;
            const importedProductExists = (await db.importedProduct.count({ where: { id: importedProduct.id } })) > 0;
            expect(productExists).toBe(true);
            expect(importedProductExists).toBe(true);
        });
    });
});
