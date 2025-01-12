import { simpleFaker } from '@faker-js/faker/.';
import { exportsForTesting } from '../../markRetailerProductsArchived';

if (!exportsForTesting) {
    throw new Error('Environment is not tests.');
}

const { groupByRetailer } = exportsForTesting;

describe('markRetailerProductsArchived', () => {
    describe('groupByRetailer', () => {
        it('should group by retailer for single item', () => {
            const retailerId = simpleFaker.string.uuid();
            const retailerShopifyProductIds = [simpleFaker.string.uuid()];
            const retailerImportedProductDetails = retailerShopifyProductIds.map((retailerShopifyProductId) => ({
                retailerId,
                retailerShopifyProductId,
            }));
            const res = groupByRetailer(retailerImportedProductDetails);
            expect(res.size).toBe(1);
            expect(res.get(retailerId)).toEqual(retailerShopifyProductIds);
        });

        it('should group multiple retailers for multiple items', () => {
            const retailerOne = simpleFaker.string.uuid();
            const retailerOneShopifyProductIds = [
                simpleFaker.string.uuid(),
                simpleFaker.string.uuid(),
                simpleFaker.string.uuid(),
            ];
            const retailerTwo = simpleFaker.string.uuid();
            const retailerTwoShopifyProductIds = [simpleFaker.string.uuid(), simpleFaker.string.uuid()];
            const retailerOneImportedProductDetails = retailerOneShopifyProductIds.map((retailerShopifyProductId) => ({
                retailerId: retailerOne,
                retailerShopifyProductId,
            }));
            const retailerTwoImportedProductDetails = retailerTwoShopifyProductIds.map((retailerShopifyProductId) => ({
                retailerId: retailerTwo,
                retailerShopifyProductId,
            }));
            const retailerImportedProductDetails = [
                ...retailerOneImportedProductDetails,
                ...retailerTwoImportedProductDetails,
            ];
            const res = groupByRetailer(retailerImportedProductDetails);

            expect(res.size).toBe(2);
            expect(res.get(retailerOne)).toEqual(retailerOneShopifyProductIds);
            expect(res.get(retailerTwo)).toEqual(retailerTwoShopifyProductIds);
        });

        it('should be empty map if pass empty array', async () => {
            const res = groupByRetailer([]);
            expect(res.size).toBe(0);
        });
    });
});
