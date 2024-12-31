import { simpleFaker } from '@faker-js/faker/.';
import { exportsForTesting } from '../../markRetailerProductsArchived';
import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import { createTestOrderWithEntireFlow, type TestOrderEntireFlow } from '@db/factories/order.factories';
import { generateImportedProduct, generateProduct } from '@db/factories/pricelist.factories';
import { mutateAndValidateGraphQLData } from '/opt/nodejs/utils';
import { UPDATE_PRODUCT_STATUS_MUTATION } from '../../../graphql';
import { createTestSession } from '@db/factories/session.factories';

if (!exportsForTesting) {
    throw new Error('Environment is not tests.');
}

jest.mock('/opt/nodejs/utils', () => ({
    mutateAndValidateGraphQLData: jest.fn(),
}));

const { getAllRetailerImportedProductDetails, markRetailerProductsArchived } = exportsForTesting;

describe('markRetailerProductsArchived', () => {
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

        it('should return empty array if invalid retailerId', async () => {
            const { client } = database;
            const res = await getAllRetailerImportedProductDetails(nonExistentId, client);
            expect(res).toHaveLength(0);
        });
    });

    describe('markRetailerProductsArchived', () => {
        it('should archive single product for supplier with correct mutation parameters', async () => {
            const { client } = database;
            const { supplier, retailer, importedProduct } = orderEntireFlowDetails;
            const { shopifyProductId } = importedProduct;
            (mutateAndValidateGraphQLData as jest.Mock).mockResolvedValue({});
            await markRetailerProductsArchived(supplier.id, client);
            expect(mutateAndValidateGraphQLData).toHaveBeenCalledTimes(1);
            expect(mutateAndValidateGraphQLData).toHaveBeenCalledWith(
                retailer.shop,
                retailer.accessToken,
                UPDATE_PRODUCT_STATUS_MUTATION,
                {
                    input: {
                        id: shopifyProductId,
                        status: 'ARCHIVED',
                    },
                },
                'Failed to update product status.',
            );
        });

        it('should archive all products in single retailer for suppliers', async () => {
            const { client } = database;
            const { supplier, retailer, priceList } = orderEntireFlowDetails;
            const newProduct = await generateProduct(priceList.id);
            await generateImportedProduct(newProduct.id, retailer.id);
            (mutateAndValidateGraphQLData as jest.Mock).mockResolvedValue({});
            await markRetailerProductsArchived(supplier.id, client);
            expect(mutateAndValidateGraphQLData).toHaveBeenCalledTimes(2);
        });

        it('should handle case no products found for supplier', async () => {
            const { client } = database;
            (mutateAndValidateGraphQLData as jest.Mock).mockResolvedValue({});
            await markRetailerProductsArchived(nonExistentId, client);
            expect(mutateAndValidateGraphQLData).toHaveBeenCalledTimes(0);
        });

        it('should archive all products for multiple retailers importing same product', async () => {
            const { client } = database;
            const { supplier, product } = orderEntireFlowDetails;
            const retailerTwo = await createTestSession();
            await generateImportedProduct(product.id, retailerTwo.id);
            (mutateAndValidateGraphQLData as jest.Mock).mockResolvedValue({});
            await markRetailerProductsArchived(supplier.id, client);
            expect(mutateAndValidateGraphQLData).toHaveBeenCalledTimes(2);
        });
    });
});
