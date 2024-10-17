import { PoolClient } from 'pg';
import { EditedVariant, PriceListDetails } from '../types';
import { createMapToRestObj, mutateAndValidateGraphQLData } from '../util';
import { ADJUST_INVENTORY_MUTATION, PRODUCT_VARIANT_BULK_UPDATE_PRICE, UPDATE_PRODUCT_MUTATION } from '../graphql';
import { InventorySetQuantitiesMutation, UpdateProductMutation } from '../types/admin.generated';
import { getPricingDetails } from './util';
import { ProductStatus } from '../types/admin.types';

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

// TODO: I should refactor this in future, but it's not urgent
// ==============================================================================================================
// START: HELPER FUNCTIONS TO BROADCAST CHANGES TO PRODUCT STATUS, PRODUCT VARIANT PRICE + INVENTORY TO RETAILERS
// ==============================================================================================================
// START: Functions related to updating prices in the database
async function updateVariantPricesDatabase(
    editedVariants: EditedVariant[],
    supplierShopifyProductId: string,
    client: PoolClient,
) {
    const priceListDetailsQuery = `
        SELECT "PriceList".* FROM "Product"
        INNER JOIN "PriceList" ON "Product"."priceListId" = "PriceList"."id"
        WHERE "Product"."shopifyProductId" = $1
    `;
    const res = await client.query(priceListDetailsQuery, [supplierShopifyProductId]);
    if (res.rows.length === 0) {
        throw new Error('No price list found.');
    }
    const variantsFormatted = editedVariants.map((variant) => {
        return {
            shopifyVariantId: variant.shopifyVariantId,
            retailPrice: variant.price,
        };
    });

    // the same product can be in multiple price lists
    const priceLists: PriceListDetails[] = res.rows;
    priceLists.forEach(async (priceList) => {
        const newPricingDetails = await getPricingDetails(
            variantsFormatted,
            priceList,
            supplierShopifyProductId,
            client,
        );
        // There should only be one unique shopifyVariantId in the price List
        const updateVariantPriceQuery = `
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
        const updateVariantPricePromises = newPricingDetails.map(
            ({ retailPrice, retailerPayment, supplierProfit, shopifyVariantId }) => {
                return client.query(updateVariantPriceQuery, [
                    retailPrice,
                    retailerPayment,
                    supplierProfit,
                    shopifyVariantId,
                    priceList.id,
                ]);
            },
        );
        await Promise.all(updateVariantPricePromises);
    });
}
// EMD: Functions related to updating prices in the database

async function getPriceListForImportedProduct(
    importedShopifyProductId: string,
    retailerShop: string,
    client: PoolClient,
) {
    try {
        const priceListQuery = `
            SELECT "PriceList".*
            FROM "ImportedProduct"
            INNER JOIN "Product" ON "Product"."id" = "ImportedProduct"."prismaProductId"
            INNER JOIN "Session" as "RetailerSession" ON "RetailerSession"."id" = "ImportedProduct"."retailerId"
            INNER JOIN "PriceList" ON "PriceList"."id" = "Product"."priceListId"
            WHERE 
                "ImportedProduct"."shopifyProductId" = $1 AND
                "RetailerSession"."shop" = $2
            LIMIT 1
        `;
        const res = await client.query(priceListQuery, [importedShopifyProductId, retailerShop]);
        if (res.rows.length != 1) {
            throw new Error('Unable to retrieve 1 price list for imported product.');
        }
        const priceList: PriceListDetails = res.rows[0];
        return priceList;
    } catch (error) {
        console.error(error);
        throw new Error('Could not retrieve price list for imported product');
    }
}

// We must have the client in order to fetch the price list, which is needed to update the cost per item and profit on shopify
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
        } // this is for typescript
        const priceList = await getPriceListForImportedProduct(
            retailerShopifyProductId,
            updateData.retailerShop,
            client,
        );

        const variantsFormatted = updateData.variants.map((variant) => ({
            retailPrice: variant.retailPrice,
            shopifyVariantId: variant.retailerShopifyVariantId,
        }));

        const variantPricingDetails = await getPricingDetails(
            variantsFormatted,
            priceList,
            supplierShopifyProductId,
            client,
        );

        const updateRetailerVariantsInput = variantPricingDetails.map((variant) => ({
            id: variant.shopifyVariantId,
            price: variant.retailPrice,
            inventoryItem: {
                cost: variant.supplierProfit,
            },
        }));
        return mutateAndValidateGraphQLData(
            updateData.retailerShop,
            updateData.retailerAccessToken,
            PRODUCT_VARIANT_BULK_UPDATE_PRICE,
            {
                productId: retailerShopifyProductId,
                variants: updateRetailerVariantsInput,
            },
            'Could not update variant details.',
        );
    });
    await Promise.all(updateRetailerProductPricesPromise);
}

async function updateRetailerInventoryOnShopify(data: GroupedQueryDataWithUpdateFields) {
    const retailerShopifyProductsIds = Array.from(data.keys());
    const updateInventoryPromises: Promise<InventorySetQuantitiesMutation>[] = [];
    retailerShopifyProductsIds.forEach((retailerShopifyProductId) => {
        const updateData = data.get(retailerShopifyProductId);
        if (!updateData) {
            return;
        }

        updateData.variants.map((variant) => {
            const input = {
                reason: 'other',
                ignoreCompareQuantity: true,
                name: 'available',
                quantities: {
                    inventoryItemId: variant.retailerShopifyInventoryItemId,
                    locationId: updateData.retailerShopifyLocationId,
                    quantity: variant.inventory,
                },
            };
            updateInventoryPromises.push(
                mutateAndValidateGraphQLData<InventorySetQuantitiesMutation>(
                    updateData.retailerShop,
                    updateData.retailerAccessToken,
                    ADJUST_INVENTORY_MUTATION,
                    {
                        input,
                    },
                    'Could not adjust retailer quantity.',
                ),
            );
        });
    });

    await Promise.all(updateInventoryPromises);
}

// functions for updating retailer product status on Shopify
async function updateRetailerProductStatusOnShopify(
    data: GroupedQueryDataWithUpdateFields,
    supplierProductStatus: ProductStatus,
) {
    const retailerShopifyProductIds = Array.from(data.keys());
    await Promise.all(
        retailerShopifyProductIds.map((retailerShopifyProductId) => {
            const retailerData = data.get(retailerShopifyProductId);
            if (!retailerData) {
                return Promise.resolve(); // this is for ts
            }
            const { retailerAccessToken, retailerShop } = retailerData;
            return mutateAndValidateGraphQLData<UpdateProductMutation>(
                retailerShop,
                retailerAccessToken,
                UPDATE_PRODUCT_MUTATION,
                {
                    input: {
                        id: retailerShopifyProductId,
                        status: supplierProductStatus,
                    },
                },
                `Could not update the product status for retailerShopifyProductId ${retailerShopifyProductId}.`,
            );
        }),
    );
}

async function updateRetailerDataOnShopify(
    data: GroupedQueryDataWithUpdateFields,
    supplierShopifyProductId: string,
    supplierProductStatus: ProductStatus,
    client: PoolClient,
) {
    await Promise.all([
        updateRetailerPriceOnShopify(data, supplierShopifyProductId, client),
        updateRetailerInventoryOnShopify(data),
        updateRetailerProductStatusOnShopify(data, supplierProductStatus),
    ]);
}

async function getImportedRetailerData(supplierShopifyProductId: string, client: PoolClient) {
    try {
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
    } catch (error) {
        console.error(error);
        throw new Error("failed to get imported retailer data for suppliers' edited variants.");
    }
}

function getFormattedRetailerImportedData(
    importedRetailerData: ImportedRetailerData[],
    supplierEditedVariants: EditedVariant[],
) {
    const supplierEditedVariantsMap = createMapToRestObj(supplierEditedVariants, 'shopifyVariantId');
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
    supplierEditedVariants: EditedVariant[],
    supplierShopifyProductId: string,
    supplierProductStatus: ProductStatus,
    client: PoolClient,
) {
    const importedRetailerData = await getImportedRetailerData(supplierShopifyProductId, client);
    const formattedImportedRetailerData = getFormattedRetailerImportedData(
        importedRetailerData,
        supplierEditedVariants,
    );

    await Promise.all([
        updateRetailerDataOnShopify(
            formattedImportedRetailerData,
            supplierShopifyProductId,
            supplierProductStatus,
            client,
        ),
        updateVariantPricesDatabase(supplierEditedVariants, supplierShopifyProductId, client),
    ]);
}

export default broadcastSupplierProductModifications;
