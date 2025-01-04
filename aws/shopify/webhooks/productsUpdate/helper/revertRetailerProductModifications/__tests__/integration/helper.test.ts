import { simpleFaker } from '@faker-js/faker/.';
import { exportsForTesting } from '../../helper';
import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import {
    createNewVariantAndImportedVariant,
    createTestOrderWithEntireFlow,
    type TestOrderEntireFlow,
} from '@db/factories/order.factories';
import { generateImportedProduct, generateImportedVariant } from '@db/factories/pricelist.factories';
import { createTestSession } from '@db/factories/session.factories';
import * as GraphQLFunctions from '../../../util/graphql';
import { createSupplierProductVariantInfo } from '../utils';

if (!exportsForTesting) {
    throw new Error('Environment is not tests.');
}

jest.mock('/opt/nodejs/utils', () => ({
    ...jest.requireActual('/opt/nodejs/utils'),
    mutateAndValidateGraphQLData: jest.fn(),
    fetchAndValidateGraphQLData: jest.fn(),
}));

const {
    getRetailerAndSupplierVariantIds,
    revertRetailerVariantPrices,
    getSupplierVariantIdToRetailerInventoryItemId,
    revertRetailerVariantInventory,
} = exportsForTesting;

const updateVariantShopifySpy = jest.spyOn(GraphQLFunctions, 'updateVariantShopify');
const updateInventoryShopifySpy = jest.spyOn(GraphQLFunctions, 'updateInventoryShopify');

describe('revertRetailerProductModifications', () => {
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

    describe('getRetailerAndSupplierVariantIds', () => {
        it('should return array of retailer and supplier variant ids', async () => {
            const { client } = database;
            const { importedVariant, variant } = orderEntireFlowDetails;
            const res = await getRetailerAndSupplierVariantIds([importedVariant.shopifyVariantId], client);
            expect(res).toHaveLength(1);
            expect(res).toEqual([
                {
                    retailerShopifyVariantId: importedVariant.shopifyVariantId,
                    supplierShopifyVariantId: variant.shopifyVariantId,
                },
            ]);
        });

        it('should work with multiple retailer shopify variant ids are passed', async () => {
            const { client } = database;
            const { importedVariant, variant, product } = orderEntireFlowDetails;
            const newRetailer = await createTestSession();
            const newImportedProduct = await generateImportedProduct(product.id, newRetailer.id);
            const newImportedVariant = await generateImportedVariant(variant.id, newImportedProduct.id);
            const res = await getRetailerAndSupplierVariantIds(
                [importedVariant.shopifyVariantId, newImportedVariant.shopifyVariantId],
                client,
            );
            expect(res).toHaveLength(2);
            expect(res).toEqual(
                expect.arrayContaining([
                    {
                        retailerShopifyVariantId: importedVariant.shopifyVariantId,
                        supplierShopifyVariantId: variant.shopifyVariantId,
                    },
                    {
                        retailerShopifyVariantId: newImportedVariant.shopifyVariantId,
                        supplierShopifyVariantId: variant.shopifyVariantId,
                    },
                ]),
            );
        });

        it('should return empty array if retailer shopify variant id is invalid', async () => {
            const { client } = database;
            const res = await getRetailerAndSupplierVariantIds([nonExistentId], client);
            expect(res).toHaveLength(0);
        });
    });

    describe('revertRetailerVariantPrices', () => {
        it(`should update retailer's price to match supplier's price on Shopify`, async () => {
            const { retailer, variant, importedVariant, importedProduct } = orderEntireFlowDetails;
            const supplierShopifyVariantData = [
                createSupplierProductVariantInfo(variant.shopifyVariantId, 20, '20.99'),
            ];
            const retailerAndSupplierVariantIds = [
                {
                    retailerShopifyVariantId: importedVariant.shopifyVariantId,
                    supplierShopifyVariantId: variant.shopifyVariantId,
                },
            ];

            await revertRetailerVariantPrices(
                supplierShopifyVariantData,
                retailerAndSupplierVariantIds,
                retailer,
                importedProduct.shopifyProductId,
            );
            const updatePriceInput = [
                {
                    id: importedVariant.shopifyVariantId,
                    price: '20.99',
                },
            ];
            expect(updateVariantShopifySpy).toHaveBeenCalledWith(
                retailer,
                importedProduct.shopifyProductId,
                updatePriceInput,
            );
        });
    });

    describe('getSupplierVariantIdToRetailerInventoryItemId', () => {
        it("should return map of supplier's shopify variant id to retailer shopify inventory item id for specific retailer", async () => {
            const { client } = database;
            const { variant, importedInventoryItem, retailer } = orderEntireFlowDetails;
            const res = await getSupplierVariantIdToRetailerInventoryItemId(
                [variant.shopifyVariantId],
                retailer.id,
                client,
            );
            expect(res.size).toBe(1);
            expect(res.get(variant.shopifyVariantId)).toEqual({
                retailerShopifyInventoryItemId: importedInventoryItem.shopifyInventoryItemId,
            });
        });

        it('should handle multiple variant mappings correctly', async () => {
            const { client } = database;
            const { variant, product, importedProduct, retailer } = orderEntireFlowDetails;
            const { newVariant } = await createNewVariantAndImportedVariant(product.id, importedProduct.id);
            const res = await getSupplierVariantIdToRetailerInventoryItemId(
                [variant.shopifyVariantId, newVariant.shopifyVariantId],
                retailer.id,
                client,
            );
            expect(res.size).toBe(2);
        });
    });

    describe('revertRetailerVariantInventory', () => {
        it("should update retailer's inventory to match supplier's inventory on Shopify", async () => {
            const { client } = database;
            const { variant, retailer, retailerFulfillmentService, importedInventoryItem } = orderEntireFlowDetails;
            const supplierInventory = 20;
            const supplierShopifyVariantData = [
                createSupplierProductVariantInfo(variant.shopifyVariantId, supplierInventory, '20.99'),
            ];
            await revertRetailerVariantInventory(supplierShopifyVariantData, retailer, client);
            expect(updateInventoryShopifySpy).toHaveBeenCalledTimes(1);
            expect(updateInventoryShopifySpy).toHaveBeenCalledWith(
                retailer,
                importedInventoryItem.shopifyInventoryItemId,
                retailerFulfillmentService.shopifyLocationId,
                supplierInventory,
            );
        });

        it('should handle inventory updates for multiple imported variants properly', async () => {
            const { client } = database;
            const { variant, retailer, importedProduct, product } = orderEntireFlowDetails;
            const supplierInventory = 20;
            const { newVariant } = await createNewVariantAndImportedVariant(product.id, importedProduct.id);
            const supplierShopifyVariantData = [
                createSupplierProductVariantInfo(variant.shopifyVariantId, supplierInventory, '20.99'),
                createSupplierProductVariantInfo(newVariant.shopifyVariantId, supplierInventory, '20.99'),
            ];
            await revertRetailerVariantInventory(supplierShopifyVariantData, retailer, client);
            expect(updateInventoryShopifySpy).toHaveBeenCalledTimes(2);
        });
    });
});
