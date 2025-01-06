import { PoolClient } from 'pg';
import { EditedVariant, GroupedQueryDataWithUpdateFields, ProductStatus } from '../../types';
import { createMapIdToRestObj } from '/opt/nodejs/utils';
import {
    updateAllVariantsPricingDb,
    updateRetailerInventoryShopify,
    updateRetailerPriceShopify,
    updateRetailerProductStatusShopify,
} from './helper';

type ImportedRetailerData = {
    retailerShopifyProductId: string;
    retailerAccessToken: string;
    retailerShop: string;
    retailerShopifyVariantId: string;
    supplierShopifyVariantId: string;
    retailerShopifyLocationId: string;
    retailerShopifyInventoryItemId: string;
};

async function getImportedRetailerData(supplierShopifyProductId: string, client: PoolClient) {
    const query = `
        SELECT 
            "ImportedProduct"."shopifyProductId" as "retailerShopifyProductId",
            "Session"."accessToken" as "retailerAccessToken",
            "Session"."shop" as "retailerShop",
            "ImportedVariant"."shopifyVariantId" as "retailerShopifyVariantId",
            "Variant"."shopifyVariantId" as "supplierShopifyVariantId",
            "FulfillmentService"."shopifyLocationId" as "retailerShopifyLocationId",
            "ImportedInventoryItem"."shopifyInventoryItemId" as "retailerShopifyInventoryItemId"
        FROM "Product"
        INNER JOIN "Variant" ON "Variant"."productId" = "Product"."id"
        INNER JOIN "ImportedVariant" ON "ImportedVariant"."prismaVariantId" = "Variant"."id"
        INNER JOIN "ImportedProduct" ON "ImportedProduct"."id" = "ImportedVariant"."importedProductId"
        INNER JOIN "ImportedInventoryItem" ON "ImportedVariant"."id" = "ImportedInventoryItem"."importedVariantId"
        INNER JOIN "Session" ON "ImportedProduct"."retailerId" = "Session"."id"
        INNER JOIN "FulfillmentService" ON "FulfillmentService"."sessionId" = "Session"."id"
        WHERE 
            "Product"."shopifyProductId" = $1 AND 
            "Session"."isAppUninstalled" = FALSE
    `;
    const res = await client.query(query, [supplierShopifyProductId]);
    const data: ImportedRetailerData[] = res.rows;
    return data;
}

function getFormattedRetailerImportedData(
    importedRetailerData: ImportedRetailerData[],
    supplierEditedVariants: EditedVariant[],
) {
    const supplierEditedVariantsMap = createMapIdToRestObj(supplierEditedVariants, 'shopifyVariantId');
    const retailerProductData: GroupedQueryDataWithUpdateFields = new Map();
    importedRetailerData.forEach((row) => {
        const prevValue = retailerProductData.get(row.retailerShopifyProductId);
        const supplierVariantDetails = supplierEditedVariantsMap.get(row.supplierShopifyVariantId);
        const newRetailPrice = supplierVariantDetails?.price;
        const newInventory = supplierVariantDetails?.newInventory;
        if (newRetailPrice === undefined || newInventory === undefined) {
            throw new Error('Retail price or inventory is not defined.');
        }
        const prevVariants = prevValue?.variants ?? [];
        const newVariants = [
            ...prevVariants,
            {
                retailerShopifyVariantId: row.retailerShopifyVariantId,
                retailerShopifyInventoryItemId: row.retailerShopifyInventoryItemId,
                retailPrice: newRetailPrice,
                inventory: supplierEditedVariantsMap.get(row.supplierShopifyVariantId)?.newInventory ?? 0,
            },
        ];
        retailerProductData.set(row.retailerShopifyProductId, {
            retailerAccessToken: row.retailerAccessToken,
            retailerShop: row.retailerShop,
            retailerShopifyLocationId: row.retailerShopifyLocationId,
            variants: newVariants,
        });
    });

    return retailerProductData;
}

async function broadcastSupplierProductModifications(
    supplierShopifyProductId: string,
    supplierEditedVariants: EditedVariant[],
    supplierProductStatus: ProductStatus,
    client: PoolClient,
) {
    // when supplier updates the product, any changes in price, inventory, and product status have to be broadcasted to all retailer's stores
    const importedRetailerData = await getImportedRetailerData(supplierShopifyProductId, client);
    const data = getFormattedRetailerImportedData(importedRetailerData, supplierEditedVariants);

    await Promise.all([
        updateRetailerPriceShopify(data, supplierShopifyProductId, client),
        updateRetailerInventoryShopify(data),
        updateRetailerProductStatusShopify(data, supplierProductStatus),
        updateAllVariantsPricingDb(supplierEditedVariants, supplierShopifyProductId, client),
    ]);
}

export default broadcastSupplierProductModifications;
