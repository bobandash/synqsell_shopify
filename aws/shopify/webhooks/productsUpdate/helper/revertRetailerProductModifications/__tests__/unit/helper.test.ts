import { simpleFaker } from '@faker-js/faker/.';
import { exportsForTesting } from '../../helper';
import { createEditedVariant, createSupplierProductVariantInfo } from '../utils';

if (!exportsForTesting) {
    throw new Error('Environment is not tests.');
}

const { hasImportantRetailerVariantChanges } = exportsForTesting;

describe('revertRetailerProductModifications', () => {
    describe('hasImportantRetailerVariantChanges', () => {
        const retailerShopifyVariantId = simpleFaker.string.uuid();
        const supplierShopifyVariantId = simpleFaker.string.uuid();
        const retailerAndSupplierVariantIds = [
            {
                retailerShopifyVariantId,
                supplierShopifyVariantId,
            },
        ];

        it('should return true if price and inventory are different', () => {
            const retailerEditedVariants = [createEditedVariant(retailerShopifyVariantId, 10, '24.99')];
            const supplierShopifyVariantData = [createSupplierProductVariantInfo(supplierShopifyVariantId, 7, '24.89')];
            const res = hasImportantRetailerVariantChanges(
                retailerEditedVariants,
                supplierShopifyVariantData,
                retailerAndSupplierVariantIds,
            );
            expect(res).toBe(true);
        });

        it('should return true if only price is different', () => {
            const retailerEditedVariants = [createEditedVariant(retailerShopifyVariantId, 10, '24.99')];
            const supplierShopifyVariantData = [
                createSupplierProductVariantInfo(supplierShopifyVariantId, 10, '24.89'),
            ];
            const res = hasImportantRetailerVariantChanges(
                retailerEditedVariants,
                supplierShopifyVariantData,
                retailerAndSupplierVariantIds,
            );
            expect(res).toBe(true);
        });

        it('should return true if only inventory is different', () => {
            const retailerEditedVariants = [createEditedVariant(retailerShopifyVariantId, 7, '24.99')];
            const supplierShopifyVariantData = [
                createSupplierProductVariantInfo(supplierShopifyVariantId, 10, '24.99'),
            ];
            const res = hasImportantRetailerVariantChanges(
                retailerEditedVariants,
                supplierShopifyVariantData,
                retailerAndSupplierVariantIds,
            );
            expect(res).toBe(true);
        });

        it('should return true if one product has different inventory or price when checking multiple variants', () => {
            const newRetailerShopifyVariantId = simpleFaker.string.uuid();
            const newSupplierShopifyVariantId = simpleFaker.string.uuid();
            const newRetailerAndSupplierVariantIds = [
                {
                    retailerShopifyVariantId,
                    supplierShopifyVariantId,
                },
                {
                    retailerShopifyVariantId: newRetailerShopifyVariantId,
                    supplierShopifyVariantId: newSupplierShopifyVariantId,
                },
            ];
            const retailerEditedVariants = [
                createEditedVariant(retailerShopifyVariantId, 10, '24.99'),
                createEditedVariant(newRetailerShopifyVariantId, 7, '24.99'),
            ];
            const supplierShopifyVariantData = [
                createSupplierProductVariantInfo(supplierShopifyVariantId, 10, '24.99'),
                createSupplierProductVariantInfo(newSupplierShopifyVariantId, 17, '24.99'),
            ];
            const res = hasImportantRetailerVariantChanges(
                retailerEditedVariants,
                supplierShopifyVariantData,
                newRetailerAndSupplierVariantIds,
            );
            expect(res).toBe(true);
        });

        it('should return false if price and inventory are the same', () => {
            const retailerEditedVariants = [createEditedVariant(retailerShopifyVariantId, 10, '24.99')];
            const supplierShopifyVariantData = [
                createSupplierProductVariantInfo(supplierShopifyVariantId, 10, '24.99'),
            ];
            const res = hasImportantRetailerVariantChanges(
                retailerEditedVariants,
                supplierShopifyVariantData,
                retailerAndSupplierVariantIds,
            );
            expect(res).toBe(false);
        });
    });
});
