import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import { createTestOrderWithEntireFlow, type TestOrderEntireFlow } from '@db/factories/order.factories';
import { createEditedVariant, createSupplierProductVariantInfo } from '../utils';
import { getVariantDataShopify } from '../../../util';
import revertProductVariants from '../../revertProductVariants';
import * as helperFunctions from '../../helper';
jest.mock('../../../util', () => ({
    getProductStatusShopify: jest.fn(),
    updateProductStatusShopify: jest.fn(),
    getVariantDataShopify: jest.fn(),
}));
jest.mock('/opt/nodejs/utils', () => ({
    ...jest.requireActual('/opt/nodejs/utils'),
    fetchAndValidateGraphQLData: jest.fn(),
    mutateAndValidateGraphQLData: jest.fn(),
}));

const revertRetailerVariantPricesSpy = jest.spyOn(helperFunctions, 'revertRetailerVariantPrices');
const revertRetailerVariantInventorySpy = jest.spyOn(helperFunctions, 'revertRetailerVariantInventory');

describe('revertProductVariants', () => {
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

    it(`should not update prices or inventory on Shopify if supplier's and retailer's prices and inventory already matches`, async () => {
        const { client } = database;
        const { importedProduct, importedVariant, variant, retailer, supplier } = orderEntireFlowDetails;
        const retailerEditedVariants = [createEditedVariant(importedVariant.shopifyVariantId, 10, '24.99', false)];
        (getVariantDataShopify as jest.Mock).mockResolvedValue([
            createSupplierProductVariantInfo(variant.shopifyVariantId, 10, '24.99'),
        ]);
        await revertProductVariants(
            importedProduct.shopifyProductId,
            retailerEditedVariants,
            retailer,
            supplier,
            client,
        );
        expect(revertRetailerVariantPricesSpy).toHaveBeenCalledTimes(0);
        expect(revertRetailerVariantInventorySpy).toHaveBeenCalledTimes(0);
    });

    it(`should update price and inventory on Shopify if inventory does not match`, async () => {
        const { client } = database;
        const { importedProduct, importedVariant, variant, retailer, supplier } = orderEntireFlowDetails;
        const retailerEditedVariants = [createEditedVariant(importedVariant.shopifyVariantId, 10, '24.99', false)];
        (getVariantDataShopify as jest.Mock).mockResolvedValueOnce([
            createSupplierProductVariantInfo(variant.shopifyVariantId, 7, '24.99'),
        ]);
        await revertProductVariants(
            importedProduct.shopifyProductId,
            retailerEditedVariants,
            retailer,
            supplier,
            client,
        );
        expect(revertRetailerVariantPricesSpy).toHaveBeenCalledTimes(1);
        expect(revertRetailerVariantInventorySpy).toHaveBeenCalledTimes(1);
    });

    it(`should update price and inventory on Shopify if price does not match`, async () => {
        const { client } = database;
        const { importedProduct, importedVariant, variant, retailer, supplier } = orderEntireFlowDetails;
        const retailerEditedVariants = [createEditedVariant(importedVariant.shopifyVariantId, 10, '24.99', false)];
        (getVariantDataShopify as jest.Mock).mockResolvedValueOnce([
            createSupplierProductVariantInfo(variant.shopifyVariantId, 10, '23.99'),
        ]);
        await revertProductVariants(
            importedProduct.shopifyProductId,
            retailerEditedVariants,
            retailer,
            supplier,
            client,
        );
        expect(revertRetailerVariantPricesSpy).toHaveBeenCalledTimes(1);
        expect(revertRetailerVariantInventorySpy).toHaveBeenCalledTimes(1);
    });
});
