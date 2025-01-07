import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import { createTestOrderWithEntireFlow, TestOrderEntireFlow } from '@db/factories/order.factories';
import { exportsForTesting } from '../..';
import { createTestRole } from '@db/factories/role.factories';
import { ROLES } from '@db/constants';
import {
    generateImportedInventoryItem,
    generateImportedProduct,
    generateImportedVariant,
} from '@db/factories/pricelist.factories';
import { generateFulfillmentService } from '@db/factories/fulfillmentService.factories';
import {
    updateAllVariantsPricingDb,
    updateRetailerVariantPricesShopify,
    updateRetailerProductStatusShopify,
    updateRetailerVariantInventoriesShopify,
} from '../../helper';
import { createEditedVariant } from '../utils';
import { generateRandomRetailPrice } from '@db/fixtures';
import { PRODUCT_STATUS } from '~/util-layer/constants';
if (!exportsForTesting) {
    throw new Error('Environment is not tests.');
}

const { getImportedRetailerData, broadcastSupplierProductModifications } = exportsForTesting;

jest.mock('../../helper', () => ({
    updateRetailerVariantPricesShopify: jest.fn(),
    updateRetailerVariantInventoriesShopify: jest.fn(),
    updateRetailerProductStatusShopify: jest.fn(),
    updateAllVariantsPricingDb: jest.fn(),
}));

describe('broadcastSupplierProductModifications', () => {
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

    describe('getImportedRetailerData', () => {
        it('should return the retailer information if they imported the product', async () => {
            const { client } = database;
            const {
                product,
                retailerFulfillmentService,
                variant,
                importedInventoryItem,
                importedProduct,
                importedVariant,
                retailer,
            } = orderEntireFlowDetails;
            const res = await getImportedRetailerData(product.shopifyProductId, client);
            expect(res).toHaveLength(1);
            expect(res[0]).toMatchObject({
                retailerShopifyProductId: importedProduct.shopifyProductId,
                retailerAccessToken: retailer.accessToken,
                retailerShop: retailer.shop,
                retailerShopifyVariantId: importedVariant.shopifyVariantId,
                supplierShopifyVariantId: variant.shopifyVariantId,
                retailerShopifyLocationId: retailerFulfillmentService.shopifyLocationId,
                retailerShopifyInventoryItemId: importedInventoryItem.shopifyInventoryItemId,
            });
        });

        it('should return multiple retailers if multiple retailers imported the product', async () => {
            const { product, variant, inventoryItem } = orderEntireFlowDetails;
            const { client } = database;
            const { session: newRetailer } = await createTestRole(ROLES.RETAILER, false);
            await generateFulfillmentService(newRetailer.id);
            const importedProduct = await generateImportedProduct(product.id, newRetailer.id);
            const importedVariant = await generateImportedVariant(variant.id, importedProduct.id);
            await generateImportedInventoryItem(inventoryItem.id, importedVariant.id);
            const res = await getImportedRetailerData(product.shopifyProductId, client);
            expect(res).toHaveLength(2);
        });
    });

    // we do not need that many tests for this function because all the implementation was already extensively tested
    describe('broadcastSupplierProductModifications', () => {
        it('should update all retailer details and database', async () => {
            const { product, variant } = orderEntireFlowDetails;
            const { client } = database;
            const editedVariants = [createEditedVariant(variant.shopifyVariantId, 10, generateRandomRetailPrice())];
            await broadcastSupplierProductModifications(
                product.shopifyProductId,
                editedVariants,
                PRODUCT_STATUS.ACTIVE,
                client,
            );
            expect(updateRetailerVariantPricesShopify).toHaveBeenCalledTimes(1);
            expect(updateRetailerVariantInventoriesShopify).toHaveBeenCalledTimes(1);
            expect(updateRetailerProductStatusShopify).toHaveBeenCalledTimes(1);
            expect(updateAllVariantsPricingDb).toHaveBeenCalledTimes(1);
        });
    });
});
