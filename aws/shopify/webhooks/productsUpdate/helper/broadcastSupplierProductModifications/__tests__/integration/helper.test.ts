import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import { createTestOrderWithEntireFlow, TestOrderEntireFlow } from '@db/factories/order.factories';
import { simpleFaker } from '@faker-js/faker/.';
import { exportsForTesting } from '../../helper';
import { generatePriceList, generateProduct, generateVariant } from '@db/factories/pricelist.factories';
import { PRICE_LIST_PRICING_STRATEGY } from '@db/constants';
import { generateRandomPricesForVariant, generateRandomRetailPrice } from '@db/fixtures';
import db from '@db/test-db';
import { createEditedVariant } from '../utils';

if (!exportsForTesting) {
    throw new Error('Environment is not tests.');
}

jest.mock('/opt/nodejs/utils', () => ({
    mutateAndValidateGraphQLData: jest.fn(),
}));

const {
    getAllPriceLists,
    updateVariantPriceDb,
    updateAllVariantsPricingDb,
    getPriceListForImportedProduct,
    updateRetailerPriceShopify,
    updateRetailerInventoryShopify,
    updateRetailerProductStatusShopify,
} = exportsForTesting;

describe('broadcastSupplierProductModifications', () => {
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

    describe('getAllPriceLists', () => {
        it('should throw error if no price list exists for product', async () => {
            const { client } = database;
            await expect(getAllPriceLists(nonExistentId, client)).rejects.toThrow();
        });

        it('should return price lists the product is in', async () => {
            const { product, priceList } = orderEntireFlowDetails;
            const { client } = database;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { createdAt, ...rest } = priceList;
            const res = await getAllPriceLists(product.shopifyProductId, client);
            expect(res).toHaveLength(1);
            expect(res[0]).toMatchObject(rest);
        });

        it('should return multiple price lists if product is in multiple price lists', async () => {
            const { product, supplier } = orderEntireFlowDetails;
            const { client } = database;
            const newPriceList = await generatePriceList(supplier.id, false, PRICE_LIST_PRICING_STRATEGY.WHOLESALE);
            await generateProduct(newPriceList.id, {
                shopifyProductId: product.shopifyProductId,
            });
            const res = await getAllPriceLists(product.shopifyProductId, client);
            expect(res).toHaveLength(2);
        });
    });

    describe('updateVariantPriceDb', () => {
        it('should update variant price information', async () => {
            const { client } = database;
            const { priceList, variant } = orderEntireFlowDetails;
            const { retailPrice, retailerPayment, supplierProfit } = generateRandomPricesForVariant();
            const newPricing = {
                retailPrice,
                retailerPayment,
                supplierProfit,
            };
            const newPricingWithIdentifiers = {
                ...newPricing,
                shopifyVariantId: variant.shopifyVariantId,
                priceListId: priceList.id,
            };
            await updateVariantPriceDb(newPricingWithIdentifiers, client);
            const variantQuery = await db.variant.findFirstOrThrow({
                where: {
                    id: variant.id,
                },
            });
            expect(variantQuery).toMatchObject(newPricing);
        });
    });

    describe('updateAllVariantsPricingDb', () => {
        it('should update multiple variant price information', async () => {
            const { client } = database;
            const { variant, product } = orderEntireFlowDetails;
            const newVariant = await generateVariant(product.id);
            const editedVariants = [
                createEditedVariant(variant.shopifyVariantId, 10, generateRandomRetailPrice()),
                createEditedVariant(newVariant.shopifyVariantId, 10, generateRandomRetailPrice()),
            ];
            await updateAllVariantsPricingDb(editedVariants, product.shopifyProductId, client);
            const variantOneQuery = await db.variant.findFirstOrThrow({
                where: {
                    id: variant.id,
                },
            });
            const variantTwoQuery = await db.variant.findFirstOrThrow({
                where: {
                    id: newVariant.id,
                },
            });
            expect(variantOneQuery.retailPrice).toBe(editedVariants[0].price);
            expect(variantTwoQuery.retailPrice).toBe(editedVariants[1].price);
        });
    });

    describe('getPriceListForImportedProduct', () => {
        it('should return the price list the imported product is in', async () => {
            const { importedProduct, priceList } = orderEntireFlowDetails;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { createdAt, ...rest } = priceList;
            const { client } = database;
            const res = await getPriceListForImportedProduct(importedProduct.shopifyProductId, client);
            expect(res).toMatchObject(rest);
        });

        it('should throw error if imported product does not exist', async () => {
            const { client } = database;
            await expect(getPriceListForImportedProduct(nonExistentId, client)).rejects.toThrow();
        });
    });
});
