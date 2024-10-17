import { PoolClient } from 'pg';
import { EditedVariant, Session } from '../types';
import { createMapToRestObj, fetchAndValidateGraphQLData, mutateAndValidateGraphQLData } from '../util';
import {
    ADJUST_INVENTORY_MUTATION,
    PRODUCT_VARIANT_BULK_UPDATE_PRICE,
    PRODUCT_VARIANT_INFO,
    UPDATE_PRODUCT_MUTATION,
} from '../graphql';
import { ProductVariantInfoQuery, UpdateProductMutation } from '../types/admin.generated';
import { ProductStatus } from '../types/admin.types';

type VariantAndImportedVariant = {
    retailerShopifyVariantId: string;
    supplierShopifyVariantId: string;
};

type SupplierVariantIdToRetailerInventoryId = {
    supplierVariantId: string;
    retailerShopifyInventoryItemId: string;
};

// ==============================================================================================================
// START: HELPER FUNCTIONS FOR REVERTING ANY CHANGES MADE BY THE RETAILER TO SUPPLIER STATUS
// ==============================================================================================================
async function getRetailerSession(retailerShopifyProductId: string, client: PoolClient) {
    try {
        const query = `
            SELECT session.* 
            FROM "ImportedProduct"
            JOIN "Session" session ON "ImportedProduct"."retailerId" = session.id 
            WHERE "shopifyProductId" = $1 
        `;
        const res = await client.query(query, [retailerShopifyProductId]);
        if (res.rows.length === 0) {
            throw new Error(`No retailer session exists for retailerShopifyId ${retailerShopifyProductId}.`);
        }
        return res.rows[0];
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to get retailer session from retailerShopifyProductId ${retailerShopifyProductId}.`);
    }
}

async function getSupplierSession(retailerShopifyProductId: string, client: PoolClient) {
    try {
        const query = `
            SELECT "Session".* 
            FROM "ImportedProduct"
            JOIN "Product" ON "ImportedProduct"."prismaProductId" = "Product".id
            JOIN "PriceList" ON "Product"."priceListId" = "PriceList".id
            JOIN "Session" ON "PriceList"."supplierId" = "Session".id
            WHERE "ImportedProduct"."shopifyProductId" = $1 
        `;
        const res = await client.query(query, [retailerShopifyProductId]);
        if (res.rows.length === 0) {
            throw new Error(`No supplier session exists for retailerShopifyId ${retailerShopifyProductId}.`);
        }
        return res.rows[0];
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to get supplier session from retailerShopifyProductId ${retailerShopifyProductId}.`);
    }
}

async function changeRetailerProductStatusArchived(retailerSession: Session, retailerShopifyProductId: string) {
    try {
        await mutateAndValidateGraphQLData<UpdateProductMutation>(
            retailerSession.shop,
            retailerSession.accessToken,
            UPDATE_PRODUCT_MUTATION,
            {
                input: {
                    id: retailerShopifyProductId,
                    status: ProductStatus.Archived,
                },
            },
            `Failed to update product status to archived for sessionId ${retailerSession.id} and retailerShopifyProductId ${retailerShopifyProductId}.`,
        );
    } catch (error) {
        console.error(error);
        throw new Error('Failed to change retailer product status to archived.');
    }
}

async function getFulfillmentService(sessionId: string, client: PoolClient) {
    try {
        const query = `SELECT * FROM "FulfillmentService" WHERE "sessionId" = $1 LIMIT 1`;
        const res = await client.query(query, [sessionId]);
        if (res.rows.length === 0) {
            throw new Error(`No fulfillment service exists for sessionId ${sessionId}.`);
        }
        const fulfillmentService = res.rows[0];
        return fulfillmentService;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to get fulfillment service from sessionId ${sessionId}.`);
    }
}

function createMapSupplierToRetailerVariantId(variantAndImportedVariant: VariantAndImportedVariant[]) {
    const map = new Map<string, string>();
    variantAndImportedVariant.forEach(({ retailerShopifyVariantId, supplierShopifyVariantId }) => {
        map.set(supplierShopifyVariantId, retailerShopifyVariantId);
    });
    return map;
}

function createMapSupplierVariantIdToRetailerShopifyInventoryItemId(
    supplierVariantIdToRetailerInventoryId: SupplierVariantIdToRetailerInventoryId[],
) {
    const map = new Map<string, string>();
    supplierVariantIdToRetailerInventoryId.forEach(({ supplierVariantId, retailerShopifyInventoryItemId }) => {
        map.set(supplierVariantId, retailerShopifyInventoryItemId);
    });
    return map;
}

// checks if there are any important changes to price or inventory
function hasImportantRetailerProductChanges(
    supplierShopifyVariantData: ProductVariantInfoQuery[],
    supplierToRetailerVariantId: Map<string, string>,
    retailerEditedVariantsMap: Map<string, Omit<EditedVariant, 'shopifyVariantId'>>,
) {
    // compares the retailer and supplier variants to check if there's any discrepancies between price or inventory
    let hasImportantChange = false;

    supplierShopifyVariantData.forEach(({ productVariant: supplierProductVariant }) => {
        const supplierShopifyVariantId = supplierProductVariant?.id ?? '';
        const supplierPrice = supplierProductVariant?.price;
        const supplierInventory = supplierProductVariant?.inventoryQuantity;
        const retailerShopifyVariantId = supplierToRetailerVariantId.get(supplierShopifyVariantId);
        if (!retailerShopifyVariantId) {
            throw new Error(`Retailer variant id does not exist for supplier variant id ${supplierShopifyVariantId}.`);
        }
        const retailerPrice = retailerEditedVariantsMap.get(retailerShopifyVariantId)?.price ?? 0;
        const retailerInventory = retailerEditedVariantsMap.get(retailerShopifyVariantId)?.newInventory ?? 0;
        if (
            Number(retailerPrice) !== Number(supplierPrice) ||
            Number(supplierInventory) !== Number(retailerInventory)
        ) {
            hasImportantChange = true;
        }
    });

    return hasImportantChange;
}

async function updateRetailerPrice(
    supplierShopifyVariantData: ProductVariantInfoQuery[],
    supplierToRetailerVariantId: Map<string, string>,
    retailerSession: Session,
    importedShopifyProductId: string,
) {
    const retailerVariantEditInput = supplierShopifyVariantData.map(({ productVariant }) => {
        const supplierVariantId = productVariant?.id ?? '';
        const supplierPrice = productVariant?.price;
        const retailerVariantId = supplierToRetailerVariantId.get(supplierVariantId);
        if (!retailerVariantId) {
            throw new Error('Supplier variant cannot match with retailer variant.');
        }
        return {
            id: retailerVariantId,
            price: supplierPrice,
        };
    });

    await mutateAndValidateGraphQLData(
        retailerSession.shop,
        retailerSession.accessToken,
        PRODUCT_VARIANT_BULK_UPDATE_PRICE,
        {
            productId: importedShopifyProductId,
            variants: retailerVariantEditInput,
        },
        'Failed to update price for retailer product.',
    );
}

async function updateRetailerInventory(
    supplierShopifyVariantData: ProductVariantInfoQuery[],
    retailerSession: Session,
    client: PoolClient,
) {
    const fulfillmentService = await getFulfillmentService(retailerSession.id, client);
    const supplierVariantIds = supplierShopifyVariantData.map(({ productVariant }) => productVariant?.id);
    const supplierVariantIdToRetailerInventoryIdQuery = `
        SELECT 
            "Variant"."shopifyVariantId" AS "supplierVariantId",
            "ImportedInventoryItem"."shopifyInventoryItemId" AS "retailerShopifyInventoryItemId"  
        FROM "Variant" 
        INNER JOIN "ImportedVariant" ON "ImportedVariant"."prismaVariantId" = "Variant"."id"
        INNER JOIN "ImportedInventoryItem" ON "ImportedInventoryItem"."importedVariantId" = "ImportedVariant"."id"
        WHERE "Variant"."shopifyVariantId" = ANY($1)  
    `;
    const supplierVariantIdToRetailerInventoryId: SupplierVariantIdToRetailerInventoryId[] = (
        await client.query(supplierVariantIdToRetailerInventoryIdQuery, [supplierVariantIds])
    ).rows;

    const supplierVariantIdToRetailerInventoryIdMap = createMapSupplierVariantIdToRetailerShopifyInventoryItemId(
        supplierVariantIdToRetailerInventoryId,
    );

    const retailerSetNewQuantitiesPromises = supplierShopifyVariantData
        .map(({ productVariant }) => {
            const supplierVariantId = productVariant?.id ?? '';
            const retailerInventoryItemId = supplierVariantIdToRetailerInventoryIdMap.get(supplierVariantId);
            if (!retailerInventoryItemId) {
                return null;
            }
            const input = {
                reason: 'other',
                ignoreCompareQuantity: true,
                name: 'available',
                quantities: {
                    inventoryItemId: retailerInventoryItemId,
                    locationId: fulfillmentService.shopifyLocationId,
                    quantity: productVariant?.inventoryQuantity ?? 0,
                },
            };

            return mutateAndValidateGraphQLData(
                retailerSession.shop,
                retailerSession.accessToken,
                ADJUST_INVENTORY_MUTATION,
                {
                    input,
                },
                'Could not adjust retailer quantity.',
            );
        })
        .filter((val) => val !== null);

    await Promise.all(retailerSetNewQuantitiesPromises);
}

async function revertRetailerProductModificationOnShopify(
    supplierShopifyVariantData: ProductVariantInfoQuery[],
    supplierToRetailerVariantId: Map<string, string>,
    retailerSession: Session,
    importedShopifyProductId: string,
    client: PoolClient,
) {
    try {
        await Promise.all([
            updateRetailerPrice(
                supplierShopifyVariantData,
                supplierToRetailerVariantId,
                retailerSession,
                importedShopifyProductId,
            ),
            updateRetailerInventory(supplierShopifyVariantData, retailerSession, client),
        ]);

        // const retailerFulfillmentService = await getFulfillmentService(retailerSession.id, client);
    } catch (error) {
        throw error;
    }
}

async function getSupplierVariantData(supplierShopifyVariantIds: string[], supplierSession: Session) {
    try {
        const supplierVariantData = await Promise.all(
            supplierShopifyVariantIds.map((shopifyVariantId) => {
                return fetchAndValidateGraphQLData<ProductVariantInfoQuery>(
                    supplierSession.shop,
                    supplierSession.accessToken,
                    PRODUCT_VARIANT_INFO,
                    {
                        id: shopifyVariantId,
                    },
                );
            }),
        );
        return supplierVariantData;
    } catch {
        throw new Error('Failed to get supplier variant data');
    }
}

// ==============================================================================================================
// END: HELPER FUNCTIONS FOR REVERTING ANY CHANGES MADE BY THE RETAILER TO THE SUPPLIER'S PRODUCT
// ==============================================================================================================

// if the retailer changes the inventory, product status, or retail price, it is should be reverted back to the supplier's data
// !!! NOTE: in order not to trigger infinite products/update webhooks being called, we need to check if any data needs to change in the first place
// Because there is another function calls to product/update TO retailer products
// And this function listens to the product/update webhook FROM the supplier products
async function revertRetailerProductModifications(
    editedVariants: EditedVariant[],
    retailerShopifyProductId: ProductStatus,
    newProductStatus: string,
    client: PoolClient,
) {
    try {
        const [supplierSession, retailerSession] = await Promise.all([
            getSupplierSession(retailerShopifyProductId, client),
            getRetailerSession(retailerShopifyProductId, client),
        ]);

        // case: supplier uninstalled the application but product is in the retailer's shop, and retailer changed the product status
        if (supplierSession.isAppUninstalled && newProductStatus !== ProductStatus.Archived) {
            await changeRetailerProductStatusArchived(retailerSession, retailerShopifyProductId);
            return;
        }

        // TODO: refactor this
        const supplierAndRetailerVariantIdsQuery = `
        SELECT 
            "ImportedVariant"."shopifyVariantId" as "retailerShopifyVariantId",
            "Variant"."shopifyVariantId" as "supplierShopifyVariantId"
        FROM "ImportedVariant"
        INNER JOIN "Variant" ON "ImportedVariant"."prismaVariantId" = "Variant"."id"
        WHERE "ImportedVariant"."shopifyVariantId" = ANY($1)  
    `;
        const importedVariantShopifyIds = editedVariants.map(({ shopifyVariantId }) => shopifyVariantId);
        const baseAndImportedVariantData: VariantAndImportedVariant[] = (
            await client.query(supplierAndRetailerVariantIdsQuery, [importedVariantShopifyIds])
        ).rows;

        const supplierShopifyVariantIds = baseAndImportedVariantData.map(
            ({ supplierShopifyVariantId }) => supplierShopifyVariantId,
        );

        // creates a map of retailer's (imported product) shopifyVariantId to rest of fields
        const retailerEditedVariantsMap = createMapToRestObj(editedVariants, 'shopifyVariantId');
        const supplierToRetailerVariantId = createMapSupplierToRetailerVariantId(baseAndImportedVariantData);

        const supplierShopifyVariantData: ProductVariantInfoQuery[] = await getSupplierVariantData(
            supplierShopifyVariantIds,
            supplierSession,
        );

        // end all important data to perform operations
        const hasImportantChanges = hasImportantRetailerProductChanges(
            supplierShopifyVariantData,
            supplierToRetailerVariantId,
            retailerEditedVariantsMap,
        );

        if (!hasImportantChanges) {
            return;
        }

        await revertRetailerProductModificationOnShopify(
            supplierShopifyVariantData,
            supplierToRetailerVariantId,
            retailerSession,
            retailerShopifyProductId,
            client,
        );
    } catch (error) {
        console.error(error);
        throw new Error("Failed to rever retailer product modifications to supplier's product details on Shopify.");
    }
}

export default revertRetailerProductModifications;
