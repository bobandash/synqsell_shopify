import { PoolClient } from 'pg';
import { EditedVariant, Session } from '../types';
import { createMapToRestObj, fetchAndValidateGraphQLData, mutateAndValidateGraphQLData } from '../util';
import {
    ADJUST_INVENTORY_MUTATION,
    GET_PRODUCT_STATUS,
    PRODUCT_VARIANT_BULK_UPDATE_PRICE,
    PRODUCT_VARIANT_INFO,
    UPDATE_PRODUCT_MUTATION,
} from '../graphql';
import { ProductStatusQuery, ProductVariantInfoQuery, UpdateProductMutation } from '../types/admin.generated';
import { ProductStatus } from '../types/admin.types';

type RetailerAndSupplierVariantId = {
    retailerShopifyVariantId: string;
    supplierShopifyVariantId: string;
};

type SupplierVariantIdAndRetailerInventoryId = {
    supplierVariantId: string;
    retailerShopifyInventoryItemId: string;
};

// ==============================================================================================================
// START: GENERIC HELPER FUNCTIONS
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

// ==============================================================================================================
// START: FUNCTION(S) TO REVERT RETAILER PRODUCT STATUS CHANGE IF SUPPLIER UNINSTALLED APP
// ==============================================================================================================
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

// ==============================================================================================================
// START: FUNCTIONS TO REVERT ALL VARIANT CHANGES TO MATCH SUPPLIER
// ==============================================================================================================

// functions to get initial data to see if revert mutation needs to be made
async function getRetailerAndSupplierVariantIds(retailerShopifyVariantIds: string[], client: PoolClient) {
    try {
        const query = `
            SELECT 
                "ImportedVariant"."shopifyVariantId" as "retailerShopifyVariantId",
                "Variant"."shopifyVariantId" as "supplierShopifyVariantId"
            FROM "ImportedVariant"
            INNER JOIN "Variant" ON "ImportedVariant"."prismaVariantId" = "Variant"."id"
            WHERE "ImportedVariant"."shopifyVariantId" = ANY($1)  
        `;
        const retailerAndSupplierVariantIds: RetailerAndSupplierVariantId[] = (
            await client.query(query, [retailerShopifyVariantIds])
        ).rows;
        return retailerAndSupplierVariantIds;
    } catch (error) {
        console.error(error);
        throw new Error('Failed to get retailer and matching supplier shopify variant id.');
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
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to fetch variant data for supplierSessionId ${supplierSession.id}.`);
    }
}

function hasImportantRetailerVariantChanges(
    retailerEditedVariants: EditedVariant[],
    supplierShopifyVariantData: ProductVariantInfoQuery[],
    retailerAndSupplierVariantIds: RetailerAndSupplierVariantId[],
) {
    let hasImportantChanges = false;
    const supplierToRetailerVariantIdMap = createMapToRestObj(
        retailerAndSupplierVariantIds,
        'supplierShopifyVariantId',
    ); // key: supplierShopifyVariantId, value: {retailerShopifyVariantId: string}

    const retailerEditedVariantsMap = createMapToRestObj(retailerEditedVariants, 'shopifyVariantId'); // key: retailerShopifyVariantId, value: {...rest}

    supplierShopifyVariantData.forEach(({ productVariant: supplierProductVariant }) => {
        const supplierShopifyVariantId = supplierProductVariant?.id ?? '';
        const supplierPrice = supplierProductVariant?.price;
        const supplierInventory = supplierProductVariant?.inventoryQuantity;
        const retailerShopifyVariantId =
            supplierToRetailerVariantIdMap.get(supplierShopifyVariantId)?.retailerShopifyVariantId ?? null;
        if (!retailerShopifyVariantId) {
            throw new Error(`Retailer variant id does not exist for supplier variant id ${supplierShopifyVariantId}.`);
        }
        const retailerPrice = retailerEditedVariantsMap.get(retailerShopifyVariantId)?.price ?? 0;
        const retailerInventory = retailerEditedVariantsMap.get(retailerShopifyVariantId)?.newInventory ?? 0;
        if (
            Number(retailerPrice) !== Number(supplierPrice) ||
            Number(supplierInventory) !== Number(retailerInventory)
        ) {
            hasImportantChanges = true;
        }
    });

    return hasImportantChanges;
}

// functions to take action to revert product variant modifications on shopify
async function updateRetailerPrice(
    supplierShopifyVariantData: ProductVariantInfoQuery[],
    retailerAndSupplierVariantIds: RetailerAndSupplierVariantId[],
    retailerSession: Session,
    importedShopifyProductId: string,
) {
    const supplierToRetailerVariantIdMap = createMapToRestObj(
        retailerAndSupplierVariantIds,
        'supplierShopifyVariantId',
    );
    const retailerVariantEditInput = supplierShopifyVariantData.map(({ productVariant }) => {
        const supplierVariantId = productVariant?.id ?? '';
        const supplierPrice = productVariant?.price;
        const retailerVariantId = supplierToRetailerVariantIdMap.get(supplierVariantId)?.retailerShopifyVariantId;
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

async function getSupplierVariantIdToRetailerInventoryItemId(supplierVariantIds: string[], client: PoolClient) {
    try {
        const query = `
            SELECT 
                "Variant"."shopifyVariantId" AS "supplierVariantId",
                "ImportedInventoryItem"."shopifyInventoryItemId" AS "retailerShopifyInventoryItemId"  
            FROM "Variant" 
            INNER JOIN "ImportedVariant" ON "ImportedVariant"."prismaVariantId" = "Variant"."id"
            INNER JOIN "ImportedInventoryItem" ON "ImportedInventoryItem"."importedVariantId" = "ImportedVariant"."id"
            WHERE "Variant"."shopifyVariantId" = ANY($1)  
        `;

        const res = await client.query(query, [supplierVariantIds]);
        const supplierVariantIdAndRetailerInventoryItemId: SupplierVariantIdAndRetailerInventoryId[] = res.rows;
        const supplierVariantIdToRetailerInventoryIdMap = createMapToRestObj(
            supplierVariantIdAndRetailerInventoryItemId,
            'supplierVariantId',
        );
        return supplierVariantIdToRetailerInventoryIdMap;
    } catch (error) {
        console.error(error);
        throw new Error('Failed to get supplier variant id to retailer shopify inventory ids.');
    }
}

async function updateRetailerInventory(
    supplierShopifyVariantData: ProductVariantInfoQuery[],
    retailerSession: Session,
    client: PoolClient,
) {
    const supplierVariantIds = supplierShopifyVariantData.map(({ productVariant }) => productVariant?.id ?? ''); // this should not run null coalesce, just for ts
    const retailerFulfillmentService = await getFulfillmentService(retailerSession.id, client);
    const supplierVariantIdToRetailerShopifyInventoryId = await getSupplierVariantIdToRetailerInventoryItemId(
        supplierVariantIds,
        client,
    );

    const retailerSetNewQuantitiesPromises = supplierShopifyVariantData.map(({ productVariant }) => {
        const supplierVariantId = productVariant?.id ?? '';
        const retailerInventoryItemId =
            supplierVariantIdToRetailerShopifyInventoryId.get(supplierVariantId)?.retailerShopifyInventoryItemId;
        if (!retailerInventoryItemId) {
            return Promise.resolve();
        }
        const input = {
            reason: 'other',
            ignoreCompareQuantity: true,
            name: 'available',
            quantities: {
                inventoryItemId: retailerInventoryItemId,
                locationId: retailerFulfillmentService.shopifyLocationId,
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
    });

    await Promise.all(retailerSetNewQuantitiesPromises);
}

async function mutateRetailerVariantsToMatchSupplier(
    retailerShopifyProductId: string,
    supplierShopifyVariantData: ProductVariantInfoQuery[],
    retailerAndSupplierVariantIds: RetailerAndSupplierVariantId[],
    retailerSession: Session,
    client: PoolClient,
) {
    try {
        await Promise.all([
            updateRetailerPrice(
                supplierShopifyVariantData,
                retailerAndSupplierVariantIds,
                retailerSession,
                retailerShopifyProductId,
            ),
            updateRetailerInventory(supplierShopifyVariantData, retailerSession, client),
        ]);
    } catch (error) {
        console.error(error);
        throw new Error('Failed to mutate retailer shopify variants to match supplier.');
    }
}

async function revertProductVariants(
    retailerShopifyProductId: string,
    retailerEditedVariants: EditedVariant[],
    retailerSession: Session,
    supplierSession: Session,
    client: PoolClient,
) {
    try {
        const retailerShopifyVariantIds = retailerEditedVariants.map(({ shopifyVariantId }) => shopifyVariantId);
        const retailerAndSupplierVariantIds = await getRetailerAndSupplierVariantIds(retailerShopifyVariantIds, client);
        const supplierShopifyVariantIds = retailerAndSupplierVariantIds.map(
            ({ supplierShopifyVariantId }) => supplierShopifyVariantId,
        );
        const supplierShopifyVariantData = await getSupplierVariantData(supplierShopifyVariantIds, supplierSession);

        // in order to prevent the products/update webhook from triggering indefinitely by making variant mutations over and over again
        // we have to check if we need to make a mutation in the first place
        const needsMutation = hasImportantRetailerVariantChanges(
            retailerEditedVariants,
            supplierShopifyVariantData,
            retailerAndSupplierVariantIds,
        );

        if (!needsMutation) {
            return;
        }

        await mutateRetailerVariantsToMatchSupplier(
            retailerShopifyProductId,
            supplierShopifyVariantData,
            retailerAndSupplierVariantIds,
            retailerSession,
            client,
        );
    } catch (error) {
        console.error(error);
        throw new Error('Failed to revert product variant.');
    }
}
// end functions to revert product variants to supplier variant

// start functions to revert product status to supplier product status
async function getSupplierShopifyProductId(retailerShopifyProductId: string, client: PoolClient) {
    try {
        const query = `
            SELECT 
                "Product"."shopifyProductId" 
            FROM "ImportedProduct"
            INNER JOIN "Product" ON "Product"."id" = "ImportedProduct"."prismaProductId"
            WHERE "ImportedProduct"."shopifyProductId" = $1
        `;
        const res = await client.query(query, [retailerShopifyProductId]);
        if (res.rows.length === 0) {
            throw new Error(
                `No supplier shopify product id exists for retailerShopifyProductId ${retailerShopifyProductId}.`,
            );
        }
        return res.rows[0] as string;
    } catch (error) {
        console.error(error);
        throw new Error(
            `Failed to get supplier shopify product id from retailerShopifyProductId ${retailerShopifyProductId}.`,
        );
    }
}

async function getSupplierProductStatus(supplierShopifyProductId: string, supplierSession: Session) {
    const res = await fetchAndValidateGraphQLData<ProductStatusQuery>(
        supplierSession.shop,
        supplierSession.accessToken,
        GET_PRODUCT_STATUS,
        {
            id: supplierShopifyProductId,
        },
    );

    const productStatus = res.product?.status;
    if (!productStatus) {
        throw new Error(`Product ${supplierShopifyProductId} does not have a product status.`);
    }
    return productStatus;
}

async function mutateRetailerProductStatusShopify(
    retailerShopifyProductId: string,
    supplierProductStatus: ProductStatus,
    retailerSession: Session,
) {
    await mutateAndValidateGraphQLData<UpdateProductMutation>(
        retailerSession.shop,
        retailerSession.accessToken,
        UPDATE_PRODUCT_MUTATION,
        {
            input: {
                id: retailerShopifyProductId,
                status: supplierProductStatus,
            },
        },
        `Failed to update ${retailerShopifyProductId} to product status ${supplierProductStatus}.`,
    );
}

async function revertProductStatus(
    retailerShopifyProductId: string,
    retailerProductStatus: ProductStatus,
    retailerSession: Session,
    supplierSession: Session,
    client: PoolClient,
) {
    try {
        const supplierShopifyProductId = await getSupplierShopifyProductId(retailerShopifyProductId, client);
        const supplierProductStatus = await getSupplierProductStatus(supplierShopifyProductId, supplierSession);
        if (supplierProductStatus === retailerProductStatus) {
            return;
        }
        await mutateRetailerProductStatusShopify(retailerShopifyProductId, supplierProductStatus, retailerSession);
    } catch (error) {
        console.error(error);
        throw new Error(
            `Failed to revert product status for retailerShopifyProductId ${retailerShopifyProductId} and retailerSessionId ${retailerSession.id}.`,
        );
    }
}

// end functions to revert product status to supplier product status

async function revertRetailerProductToSupplierProduct(
    retailerShopifyProductId: string,
    retailerProductStatus: ProductStatus,
    editedVariants: EditedVariant[],
    retailerSession: Session,
    supplierSession: Session,
    client: PoolClient,
) {
    // there are two potential things that you can be reverted
    // product variants - which related to inventory and price
    // product status - which is the status of the product (active, archived, or draft)
    await Promise.all([
        revertProductVariants(retailerShopifyProductId, editedVariants, retailerSession, supplierSession, client),
        revertProductStatus(retailerShopifyProductId, retailerProductStatus, retailerSession, supplierSession, client),
    ]);
}

// ==============================================================================================================
// END: FUNCTIONS TO REVERT ALL RETAILER PRODUCT/VARIANT CHANGES TO MATCH SUPPLIER
// ==============================================================================================================

// if the retailer changes the inventory, product status, or retail price, it is should be reverted back to the supplier's data
async function revertRetailerProductModifications(
    retailerShopifyProductId: string,
    retailerEditedVariants: EditedVariant[],
    retailerProductStatus: ProductStatus,
    client: PoolClient,
) {
    try {
        const [supplierSession, retailerSession] = await Promise.all([
            getSupplierSession(retailerShopifyProductId, client),
            getRetailerSession(retailerShopifyProductId, client),
        ]);

        // case: supplier uninstalled the application but product is in the retailer's shop, and retailer changed the product status
        if (supplierSession.isAppUninstalled && retailerProductStatus !== ProductStatus.Archived) {
            await changeRetailerProductStatusArchived(retailerSession, retailerShopifyProductId);
            return;
        }

        await revertRetailerProductToSupplierProduct(
            retailerShopifyProductId,
            retailerProductStatus,
            retailerEditedVariants,
            retailerSession,
            supplierSession,
            client,
        );
    } catch (error) {
        console.error(error);
        throw new Error("Failed to rever retailer product modifications to supplier's product details on Shopify.");
    }
}

export default revertRetailerProductModifications;
