import { PoolClient } from 'pg';
import { EditedVariant, GroupedQueryDataWithUpdateFields, PriceListDetails, ProductStatus } from '../../types';
import { getPricingDetails } from '../util';

import { updateInventoryShopify, updateProductStatusShopify, updateVariantShopify } from '../util';

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
        throw new Error(`No price list exists for ${supplierShopifyProductId}.`);
    }
    const priceLists: PriceListDetails[] = res.rows;
    return priceLists;
}

async function updateVariantPriceDb(variantPriceInfo: UpdatePriceInfoData, client: PoolClient) {
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

async function updateAllVariantsPricingDb(
    editedVariants: EditedVariant[],
    supplierShopifyProductId: string,
    client: PoolClient,
) {
    const variantsFormatted = editedVariants.map((variant) => ({
        shopifyVariantId: variant.shopifyVariantId,
        retailPrice: variant.price,
    }));
    const priceLists = await getAllPriceLists(supplierShopifyProductId, client);
    await Promise.all(
        priceLists.map(async (priceList) => {
            const newPricingInfo = await getPricingDetails(
                variantsFormatted,
                priceList,
                supplierShopifyProductId,
                client,
            );
            const updateVariantPricePromises = newPricingInfo.map((priceInfo) => {
                return updateVariantPriceDb({ ...priceInfo, priceListId: priceList.id }, client);
            });
            await Promise.all(updateVariantPricePromises);
        }),
    );
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
    if (res.rows.length === 0) {
        throw new Error(`Imported product ${importedShopifyProductId} is not in price list.`);
    }
    const priceList: PriceListDetails = res.rows[0];
    return priceList;
}

async function updateRetailerVariantPricesShopify(
    data: GroupedQueryDataWithUpdateFields,
    supplierShopifyProductId: string,
    client: PoolClient,
) {
    const retailerShopifyProductsIds = Array.from(data.keys());
    const promises = retailerShopifyProductsIds.map(async (retailerShopifyProductId) => {
        const updateData = data.get(retailerShopifyProductId);
        if (!updateData) {
            return;
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
        console.log('reached here');
        return updateVariantShopify(
            { shop: updateData.retailerShop, accessToken: updateData.retailerAccessToken },
            retailerShopifyProductId,
            input,
        );
    });
    await Promise.all(promises);
}

// ==============================================================================================================
// START: FUNCTIONS TO UPDATE INVENTORY CHANGES TO RETAILER'S STORE ON SHOPIFY
// ==============================================================================================================
async function updateRetailerVariantInventoriesShopify(data: GroupedQueryDataWithUpdateFields) {
    const retailerShopifyProductsIds = Array.from(data.keys());
    const promises = retailerShopifyProductsIds.map(async (retailerShopifyProductId) => {
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
    });
    await Promise.all(promises);
}

// ==============================================================================================================
// START: FUNCTIONS TO UPDATE PRODUCT STATUS ON SHOPIFY
// ==============================================================================================================
async function updateRetailerProductStatusShopify(
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

export {
    updateRetailerVariantPricesShopify,
    updateRetailerVariantInventoriesShopify,
    updateRetailerProductStatusShopify,
    updateAllVariantsPricingDb,
};

export const exportsForTesting =
    process.env.NODE_ENV === 'test'
        ? {
              getAllPriceLists,
              updateVariantPriceDb,
              updateAllVariantsPricingDb,
              getPriceListForImportedProduct,
              updateRetailerVariantPricesShopify,
              updateRetailerVariantInventoriesShopify,
              updateRetailerProductStatusShopify,
          }
        : undefined;
