import { PoolClient } from 'pg';
import { EditedVariant, ProductStatus } from '../../types';
import type { Session } from '/opt/nodejs/models/types';
import {
    ADJUST_INVENTORY_MUTATION,
    GET_PRODUCT_STATUS,
    PRODUCT_VARIANT_BULK_UPDATE_PRICE,
    PRODUCT_VARIANT_INFO,
    UPDATE_PRODUCT_MUTATION,
} from '../../graphql';
import { ProductStatusQuery, ProductVariantInfoQuery, UpdateProductMutation } from '../../types/admin.generated';
import { createMapIdToRestObj, fetchAndValidateGraphQLData, mutateAndValidateGraphQLData } from '/opt/nodejs/utils';
import { PRODUCT_STATUS } from '/opt/nodejs/constants';
import { getFulfillmentService } from '/opt/nodejs/models/fulfillmentService';
import {
    getRetailerSessionFromRetailerShopifyProductId,
    getSupplierSessionFromRetailerShopifyProductId,
} from '/opt/nodejs/models/session';
import { getProductStatusShopify, updateProductStatusShopify } from '../graphql';
import { getProductFromRetailerShopifyProductId } from '/opt/nodejs/models/product';

type RetailerAndSupplierVariantId = {
    retailerShopifyVariantId: string;
    supplierShopifyVariantId: string;
};

type SupplierVariantIdAndRetailerInventoryId = {
    supplierVariantId: string;
    retailerShopifyInventoryItemId: string;
};

// ==============================================================================================================
// START: FUNCTIONS TO REVERT ALL VARIANT CHANGES TO MATCH SUPPLIER
// ==============================================================================================================

// functions to get initial data to see if revert mutation needs to be made
async function getRetailerAndSupplierVariantIds(retailerShopifyVariantIds: string[], client: PoolClient) {
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
}

async function getSupplierVariantData(supplierShopifyVariantIds: string[], supplierSession: Session) {
    const supplierVariantData = await Promise.all(
        supplierShopifyVariantIds.map((shopifyVariantId) =>
            fetchAndValidateGraphQLData<ProductVariantInfoQuery>(
                supplierSession.shop,
                supplierSession.accessToken,
                PRODUCT_VARIANT_INFO,
                {
                    id: shopifyVariantId,
                },
            ),
        ),
    );
    return supplierVariantData;
}

function hasImportantRetailerVariantChanges(
    retailerEditedVariants: EditedVariant[],
    supplierShopifyVariantData: ProductVariantInfoQuery[],
    retailerAndSupplierVariantIds: RetailerAndSupplierVariantId[],
) {
    let hasImportantChanges = false;
    const supplierToRetailerVariantIdMap = createMapIdToRestObj(
        retailerAndSupplierVariantIds,
        'supplierShopifyVariantId',
    ); // key: supplierShopifyVariantId, value: {retailerShopifyVariantId: string}

    const retailerEditedVariantsMap = createMapIdToRestObj(retailerEditedVariants, 'shopifyVariantId'); // key: retailerShopifyVariantId, value: {...rest}
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
    const supplierToRetailerVariantIdMap = createMapIdToRestObj(
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
    const supplierVariantIdToRetailerInventoryIdMap = createMapIdToRestObj(
        supplierVariantIdAndRetailerInventoryItemId,
        'supplierVariantId',
    );
    return supplierVariantIdToRetailerInventoryIdMap;
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
    await Promise.all([
        updateRetailerPrice(
            supplierShopifyVariantData,
            retailerAndSupplierVariantIds,
            retailerSession,
            retailerShopifyProductId,
        ),
        updateRetailerInventory(supplierShopifyVariantData, retailerSession, client),
    ]);
}

async function revertProductVariants(
    retailerShopifyProductId: string,
    retailerEditedVariants: EditedVariant[],
    retailerSession: Session,
    supplierSession: Session,
    client: PoolClient,
) {
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
}
// end functions to revert product variants to supplier variant

// start functions to revert product status to supplier product status

async function revertProductStatus(
    retailerShopifyProductId: string,
    retailerProductStatus: ProductStatus,
    retailerSession: Session,
    supplierSession: Session,
    client: PoolClient,
) {
    // changes retailer product status to match suppliers
    const { shopifyProductId: supplierShopifyProductId } = await getProductFromRetailerShopifyProductId(
        retailerShopifyProductId,
        client,
    );
    const supplierProductStatus = await getProductStatusShopify(supplierSession, supplierShopifyProductId);
    if (supplierProductStatus === retailerProductStatus) {
        return;
    }
    await updateProductStatusShopify(retailerSession, retailerShopifyProductId, supplierProductStatus);
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
    const [supplierSession, retailerSession] = await Promise.all([
        getSupplierSessionFromRetailerShopifyProductId(retailerShopifyProductId, client),
        getRetailerSessionFromRetailerShopifyProductId(retailerShopifyProductId, client),
    ]);

    // case: supplier uninstalled the application but product is in the retailer's shop, and retailer changed the product status
    if (supplierSession.isAppUninstalled && retailerProductStatus !== PRODUCT_STATUS.ARCHIVED) {
        await updateProductStatusShopify(retailerSession, retailerShopifyProductId, PRODUCT_STATUS.ARCHIVED);
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
}

export default revertRetailerProductModifications;
