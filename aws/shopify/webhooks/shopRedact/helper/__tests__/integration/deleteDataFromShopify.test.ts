import { simpleFaker } from '@faker-js/faker/.';
import { exportsForTesting } from '../../deleteDataFromShopify';
import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import { createTestOrderWithEntireFlow, type TestOrderEntireFlow } from '@db/factories/order.factories';
import { generateImportedProduct, generateProduct } from '@db/factories/pricelist.factories';
import { mutateAndValidateGraphQLData } from '~/util-layer/utils';
import { DELETE_PRODUCT_MUTATION } from '../../../graphql';
import { createTestRole } from '@db/factories/role.factories';
import { ROLES } from '@db/constants';
if (!exportsForTesting) {
    throw new Error('Environment is not tests.');
}

jest.mock('/opt/nodejs/utils', () => ({
    mutateAndValidateGraphQLData: jest.fn(),
}));

const { getAllRetailerImportedProductDetails, deleteAllImportedProductsShopify } = exportsForTesting;

describe('deleteDataFromShopify', () => {
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
        teardownPool(database.pool);
    });

    describe('getAllRetailerImportedProductDetails', () => {
        it('should return imported product details', async () => {
            const { supplier, importedProduct } = orderEntireFlowDetails;
            const { client } = database;
            const res = await getAllRetailerImportedProductDetails(supplier.id, client);
            const details = [
                {
                    retailerShopifyProductId: importedProduct.shopifyProductId,
                    retailerId: importedProduct.retailerId,
                },
            ];
            expect(res).toHaveLength(1);
            expect(res).toEqual(details);
        });

        it('should return multiple imported product details', async () => {
            const { supplier, importedProduct, priceList, retailer } = orderEntireFlowDetails;
            const { client } = database;
            const newProduct = await generateProduct(priceList.id);
            const newImportedProduct = await generateImportedProduct(newProduct.id, retailer.id);

            const res = await getAllRetailerImportedProductDetails(supplier.id, client);
            const details = [
                {
                    retailerShopifyProductId: importedProduct.shopifyProductId,
                    retailerId: importedProduct.retailerId,
                },
                {
                    retailerShopifyProductId: newImportedProduct.shopifyProductId,
                    retailerId: newImportedProduct.retailerId,
                },
            ];
            expect(res).toHaveLength(2);
            expect(res).toEqual(details);
        });

        it('should return empty array if invalid supplier', async () => {
            const { client } = database;
            const res = await getAllRetailerImportedProductDetails(nonExistentId, client);
            expect(res).toHaveLength(0);
        });
    });

    describe('deleteAllImportedProductsShopify', () => {
        it(`should delete imported product on retailer's shopify store with correct parameters`, async () => {
            const { importedProduct, retailer, supplier } = orderEntireFlowDetails;
            const { client } = database;
            (mutateAndValidateGraphQLData as jest.Mock).mockResolvedValue({});
            await deleteAllImportedProductsShopify(supplier.id, client);
            expect(mutateAndValidateGraphQLData).toHaveBeenCalledTimes(1);
            expect(mutateAndValidateGraphQLData).toHaveBeenCalledWith(
                retailer.shop,
                retailer.accessToken,
                DELETE_PRODUCT_MUTATION,
                {
                    id: importedProduct.shopifyProductId,
                },
                'Failed to delete product for retailer.',
            );
        });

        it(`should delete all imported products for all retailers' shopify stores that imported products from supplier`, async () => {
            const { supplier, product } = orderEntireFlowDetails;
            const { client } = database;
            const { session: newRetailer } = await createTestRole(ROLES.RETAILER, false);
            await generateImportedProduct(product.id, newRetailer.id);
            (mutateAndValidateGraphQLData as jest.Mock).mockResolvedValue({});
            await deleteAllImportedProductsShopify(supplier.id, client);
            expect(mutateAndValidateGraphQLData).toHaveBeenCalledTimes(2);
        });

        it(`should not delete any imported products for nonExistent ID`, async () => {
            const { client } = database;
            (mutateAndValidateGraphQLData as jest.Mock).mockResolvedValue({});
            await deleteAllImportedProductsShopify(nonExistentId, client);
            expect(mutateAndValidateGraphQLData).toHaveBeenCalledTimes(0);
        });
    });
});
