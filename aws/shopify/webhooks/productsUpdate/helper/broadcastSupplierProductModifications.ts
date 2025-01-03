import { PoolClient } from 'pg';
import { EditedVariant, PriceListDetails, ProductStatus } from '../types';

import { getPricingDetails } from './util';
import { createMapIdToRestObj } from '/opt/nodejs/utils';
import { updateInventoryShopify, updateProductStatusShopify, updateVariantShopify } from './util/graphql';
type ImportedRetailerData = {
    retailerShopifyProductId: string;
    retailerAccessToken: string;
    retailerShop: string;
    retailerShopifyVariantId: string;
    supplierShopifyVariantId: string;
    retailerShopifyLocationId: string;
    retailerShopifyInventoryItemId: string;
};

type GroupedQueryDataWithUpdateFields = Map<
    string, // Key is Retailer Shopify Product ID (Imported Product)
    {
        retailerAccessToken: string;
        retailerShop: string;
        retailerShopifyLocationId: string;
        variants: {
            retailerShopifyVariantId: string;
            retailPrice: string;
            inventory: number;
            retailerShopifyInventoryItemId: string;
        }[];
    }
>;

type UpdatePriceInfoData = {
    retailPrice: string;
    retailerPayment: string;
    supplierProfit: string;
    shopifyVariantId: string;
    priceListId: string;
};

// ==============================================================================================================
// START: FUNCTIONS TO UPDATE PRICE CHANGES TO DATABASE
// ==============================================================================================================
// the same product can be in multiple price lists for a supplier
// if the supplier updates their product, the changes have to broadcast to retailers from all price lists
async function getAllPriceLists(supplierShopifyProductId: string, client: PoolClient) {
    const query = `
        SELECT "PriceList".* FROM "Product"
        INNER JOIN "PriceList" ON "Product"."priceListId" = "PriceList"."id"
        WHERE "Product"."shopifyProductId" = $1
    `;
    const res = await client.query(query, [supplierShopifyProductId]);
    if (res.rows.length === 0) {
        throw new Error('No price list found.');
    }
    const priceLists: PriceListDetails[] = res.rows;
    return priceLists;
}

async function updateVariantPriceInformation(variantPriceInfo: UpdatePriceInfoData, client: PoolClient) {
    const { retailPrice, retailerPayment, supplierProfit, shopifyVariantId, priceListId } = variantPriceInfo;
    const query = `
        UPDATE "Variant"
        SET 
            "retailPrice" = $1,
            "retailerPayment" = $2,
            "supplierProfit" = $3
        FROM "Product"
        WHERE 
            "Variant"."shopifyVariantId" = $4 AND
            "Variant"."productId" = "Product"."id" AND
            "Product"."priceListId" = $5
    `;
    await client.query(query, [retailPrice, retailerPayment, supplierProfit, shopifyVariantId, priceListId]);
}

async function updateVariantPricesDatabase(
    editedVariants: EditedVariant[],
    supplierShopifyProductId: string,
    client: PoolClient,
) {
    const variantsFormatted = editedVariants.map((variant) => ({
        shopifyVariantId: variant.shopifyVariantId,
        retailPrice: variant.price,
    }));
    const priceLists = await getAllPriceLists(supplierShopifyProductId, client);
    priceLists.forEach(async (priceList) => {
        const newPricingInfo = await getPricingDetails(variantsFormatted, priceList, supplierShopifyProductId, client);
        const updateVariantPricePromises = newPricingInfo.map((priceInfo) => {
            return updateVariantPriceInformation({ ...priceInfo, priceListId: priceList.id }, client);
        });
        await Promise.all(updateVariantPricePromises);
    });
}

// ==============================================================================================================
// START: FUNCTIONS TO UPDATE PRICE CHANGES TO RETAILER'S STORE ON SHOPIFY
// ==============================================================================================================
async function getPriceListForImportedProduct(importedShopifyProductId: string, client: PoolClient) {
    const query = `
        SELECT "PriceList".*
        FROM "ImportedProduct"
        INNER JOIN "Product" ON "Product"."id" = "ImportedProduct"."prismaProductId"
        INNER JOIN "Session" as "RetailerSession" ON "RetailerSession"."id" = "ImportedProduct"."retailerId"
        INNER JOIN "PriceList" ON "PriceList"."id" = "Product"."priceListId"
        WHERE 
            "ImportedProduct"."shopifyProductId" = $1
        LIMIT 1
    `;
    const res = await client.query(query, [importedShopifyProductId]);
    if (res.rows.length <= 0) {
        throw new Error('Imported product is not in price list.');
    }
    const priceList: PriceListDetails = res.rows[0];
    return priceList;
}

async function updateRetailerPriceOnShopify(
    data: GroupedQueryDataWithUpdateFields,
    supplierShopifyProductId: string,
    client: PoolClient,
) {
    const retailerShopifyProductsIds = Array.from(data.keys());
    const updateRetailerProductPricesPromise = retailerShopifyProductsIds.map(async (retailerShopifyProductId) => {
        const updateData = data.get(retailerShopifyProductId);
        if (!updateData) {
            return null;
        }
        const priceList = await getPriceListForImportedProduct(retailerShopifyProductId, client);
        const variantsFormatted = updateData.variants.map((variant) => ({
            retailPrice: variant.retailPrice,
            shopifyVariantId: variant.retailerShopifyVariantId,
        }));

        const newPricingDetails = await getPricingDetails(
            variantsFormatted,
            priceList,
            supplierShopifyProductId,
            client,
        );

        const input = newPricingDetails.map((variant) => ({
            id: variant.shopifyVariantId,
            price: variant.retailPrice,
            inventoryItem: {
                cost: variant.supplierProfit,
            },
        }));
        await updateVariantShopify(
            { shop: updateData.retailerShop, accessToken: updateData.retailerAccessToken },
            retailerShopifyProductId,
            input,
        );
    });
    await Promise.all(updateRetailerProductPricesPromise);
}

// ==============================================================================================================
// START: FUNCTIONS TO UPDATE INVENTORY CHANGES TO RETAILER'S STORE ON SHOPIFY
// ==============================================================================================================
async function updateRetailerInventoryOnShopify(data: GroupedQueryDataWithUpdateFields) {
    const retailerShopifyProductsIds = Array.from(data.keys());
    await Promise.all(
        retailerShopifyProductsIds.map(async (retailerShopifyProductId) => {
            const updateData = data.get(retailerShopifyProductId);
            if (!updateData) {
                return;
            }
            const updateInventoryPromises = updateData.variants.map((variant) =>
                updateInventoryShopify(
                    {
                        shop: updateData.retailerShop,
                        accessToken: updateData.retailerAccessToken,
                    },
                    variant.retailerShopifyInventoryItemId,
                    updateData.retailerShopifyLocationId,
                    variant.inventory,
                ),
            );
            await Promise.all(updateInventoryPromises);
        }),
    );
}

// ==============================================================================================================
// START: FUNCTIONS TO UPDATE PRODUCT STATUS ON SHOPIFY
// ==============================================================================================================
async function updateRetailerProductStatusOnShopify(
    data: GroupedQueryDataWithUpdateFields,
    supplierProductStatus: ProductStatus,
) {
    const retailerShopifyProductIds = Array.from(data.keys());
    await Promise.all(
        retailerShopifyProductIds.map((retailerShopifyProductId) => {
            const retailerData = data.get(retailerShopifyProductId);
            if (!retailerData) {
                return;
            }
            return updateProductStatusShopify(
                { shop: retailerData.retailerShop, accessToken: retailerData.retailerAccessToken },
                retailerShopifyProductId,
                supplierProductStatus,
            );
        }),
    );
}

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
        WHERE "Product"."shopifyProductId" = $1   
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

// ==============================================================================================================
// END: HELPER FUNCTIONS TO BROADCAST CHANGES TO PRODUCT STATUS, PRODUCT VARIANT PRICE + INVENTORY TO RETAILERS
// ==============================================================================================================

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
        updateRetailerPriceOnShopify(data, supplierShopifyProductId, client),
        updateRetailerInventoryOnShopify(data),
        updateRetailerProductStatusOnShopify(data, supplierProductStatus),
        updateVariantPricesDatabase(supplierEditedVariants, supplierShopifyProductId, client),
    ]);
}

export default broadcastSupplierProductModifications;
