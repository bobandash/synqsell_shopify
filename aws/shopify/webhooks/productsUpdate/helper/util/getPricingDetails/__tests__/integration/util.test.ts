import { simpleFaker } from '@faker-js/faker/.';
import { exportsForTesting } from '../../util';
import { createTestOrderWithEntireFlow, TestOrderEntireFlow } from '@db/factories/order.factories';
import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import { generateVariant } from '@db/factories/pricelist.factories';
import { generateRandomRetailPrice } from '@db/fixtures';

if (!exportsForTesting) {
    throw new Error('Environment is not test environment');
}

const { getShopifyVariantIdToSupplierProfitMap, getWholesalePricingDetails } = exportsForTesting;

describe('getPricingDetails', () => {
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

    describe('getShopifyVariantIdToSupplierProfitMap', () => {
        it('should return empty map when no variants found', async () => {
            const { client } = database;
            const { priceList } = orderEntireFlowDetails;
            const res = await getShopifyVariantIdToSupplierProfitMap(nonExistentId, priceList.id, client);
            expect(res.size).toBe(0);
        });

        it('should return map of shopify variant id to supplier profit', async () => {
            const { client } = database;
            const { priceList, product, variant } = orderEntireFlowDetails;
            const res = await getShopifyVariantIdToSupplierProfitMap(product.shopifyProductId, priceList.id, client);
            expect(res.size).toBe(1);
            expect(res.get(variant.shopifyVariantId)).toEqual({ supplierProfit: variant.supplierProfit });
        });

        it('should handle multiple variants for same product', async () => {
            const { client } = database;
            const { priceList, product, variant } = orderEntireFlowDetails;
            const newVariant = await generateVariant(product.id);
            const res = await getShopifyVariantIdToSupplierProfitMap(product.shopifyProductId, priceList.id, client);
            expect(res.size).toBe(2);
            expect(res.get(variant.shopifyVariantId)).toEqual({ supplierProfit: variant.supplierProfit });
            expect(res.get(newVariant.shopifyVariantId)).toEqual({ supplierProfit: newVariant.supplierProfit });
        });
    });

    describe('getWholesalePricingDetails', () => {
        it('should return empty array if there are no variants to check', async () => {
            const { client } = database;
            const { priceList, product } = orderEntireFlowDetails;
            const res = await getWholesalePricingDetails([], priceList.id, product.shopifyProductId, client);
            expect(res).toHaveLength(0);
        });

        it('should return pricing details with updated amount to pay retailer', async () => {
            const { client } = database;
            const { variant, priceList, product } = orderEntireFlowDetails;
            const newRetailPrice = generateRandomRetailPrice();

            const editedVariants = [
                {
                    shopifyVariantId: variant.shopifyVariantId,
                    retailPrice: newRetailPrice,
                },
            ];
            const res = await getWholesalePricingDetails(
                editedVariants,
                priceList.id,
                product.shopifyProductId,
                client,
            );
            expect(res).toHaveLength(1);
            expect(res).toEqual([
                {
                    shopifyVariantId: variant.shopifyVariantId,
                    retailPrice: newRetailPrice,
                    retailerPayment: (Number(newRetailPrice) - Number(variant.supplierProfit)).toFixed(2).toString(),
                    supplierProfit: variant.supplierProfit,
                },
            ]);
        });

        it('should return multiple pricing details if updating multiple variants', async () => {
            const { client } = database;
            const { variant, priceList, product } = orderEntireFlowDetails;
            const newVariant = await generateVariant(product.id);
            const editedVariants = [
                {
                    shopifyVariantId: variant.shopifyVariantId,
                    retailPrice: variant.retailPrice,
                },
                {
                    shopifyVariantId: newVariant.shopifyVariantId,
                    retailPrice: newVariant.retailPrice,
                },
            ];
            const res = await getWholesalePricingDetails(
                editedVariants,
                priceList.id,
                product.shopifyProductId,
                client,
            );
            expect(res).toHaveLength(2);
        });
    });
});
