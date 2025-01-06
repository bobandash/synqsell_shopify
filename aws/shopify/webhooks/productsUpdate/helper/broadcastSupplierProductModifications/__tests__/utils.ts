import { EditedVariant } from '../../../types';
import { ProductVariantInfoQuery } from '../../../types/admin.generated';

const createEditedVariant = (
    retailerShopifyVariantId: string,
    newInventory: number,
    price: string,
    hasUpdatedInventory = true,
): EditedVariant => ({
    shopifyVariantId: retailerShopifyVariantId,
    hasUpdatedInventory,
    newInventory,
    price,
});

const createSupplierProductVariantInfo = (
    supplierShopifyVariantId: string,
    inventoryQuantity: number,
    price: string,
): ProductVariantInfoQuery => ({
    productVariant: {
        id: supplierShopifyVariantId,
        price,
        inventoryQuantity,
    },
});

export { createEditedVariant, createSupplierProductVariantInfo };
