import { PoolClient } from 'pg';
import { EditedVariant, ProductStatus } from '../../types';
import type { Session } from '/opt/nodejs/models/types';
import { ProductVariantInfoQuery } from '../../types/admin.generated';
import { createMapIdToRestObj } from '/opt/nodejs/utils';
import { PRODUCT_STATUS } from '/opt/nodejs/constants';
import { getFulfillmentService } from '/opt/nodejs/models/fulfillmentService';
import {
    getRetailerSessionFromRetailerShopifyProductId,
    getSupplierSessionFromRetailerShopifyProductId,
} from '/opt/nodejs/models/session';
import {
    getProductStatusShopify,
    getShopifyVariantData,
    updateInventoryShopify,
    updatePriceShopify,
    updateProductStatusShopify,
} from '../util/graphql';
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
// START: FUNCTIONS TO REVERT RETAILER VARIANT DATA (INV, QTY, PRICE) TO MATCH SUPPLIER'S VARIANT DATA
// ==============================================================================================================
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

function hasImportantRetailerVariantChanges(
    retailerEditedVariants: EditedVariant[],
    supplierShopifyVariantData: ProductVariantInfoQuery[],
    retailerAndSupplierVariantIds: RetailerAndSupplierVariantId[],
) {
    const supplierToRetailerVariantIdMap = createMapIdToRestObj(
        retailerAndSupplierVariantIds,
        'supplierShopifyVariantId',
    );
    const retailerEditedVariantsMap = createMapIdToRestObj(retailerEditedVariants, 'shopifyVariantId');

    return supplierShopifyVariantData.some(({ productVariant }) => {
        if (!productVariant?.id) {
            throw new Error('Supplier variant is missing ID');
        }
        const retailerVariantId = supplierToRetailerVariantIdMap.get(productVariant.id)?.retailerShopifyVariantId;
        if (!retailerVariantId) {
            throw new Error(`Retailer variant id does not exist for supplier variant id ${productVariant.id}`);
        }
        const retailerVariant = retailerEditedVariantsMap.get(retailerVariantId);
        return (
            Number(retailerVariant?.price ?? 0) !== Number(productVariant.price) ||
            Number(retailerVariant?.newInventory ?? 0) !== Number(productVariant.inventoryQuantity)
        );
    });
}

async function revertRetailerVariantPrices(
    supplierShopifyVariantData: ProductVariantInfoQuery[],
    retailerAndSupplierVariantIds: RetailerAndSupplierVariantId[],
    retailerSession: Session,
    importedShopifyProductId: string,
) {
    const supplierToRetailerVariantIdMap = createMapIdToRestObj(
        retailerAndSupplierVariantIds,
        'supplierShopifyVariantId',
    );
    const input = supplierShopifyVariantData.map(({ productVariant }) => {
        const supplierVariantId = productVariant?.id ?? '';
        const supplierPrice = productVariant?.price;
        const retailerVariantId = supplierToRetailerVariantIdMap.get(supplierVariantId)?.retailerShopifyVariantId;
        if (!retailerVariantId) {
            throw new Error('Retailer variant does not exist.');
        }
        return {
            shopifyVariantId: retailerVariantId,
            price: supplierPrice,
        };
    });
    await updatePriceShopify(retailerSession, importedShopifyProductId, input);
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

async function revertRetailerVariantInventory(
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

    const retailerInventoryUpdatePromises = supplierShopifyVariantData.map(({ productVariant }) => {
        const supplierVariantId = productVariant?.id ?? '';
        const supplierInventory = productVariant?.inventoryQuantity;
        const retailerShopifyInventoryItemId =
            supplierVariantIdToRetailerShopifyInventoryId.get(supplierVariantId)?.retailerShopifyInventoryItemId;
        if (!retailerShopifyInventoryItemId || !supplierInventory) {
            return Promise.resolve();
        }
        return updateInventoryShopify(
            retailerSession,
            retailerShopifyInventoryItemId,
            retailerFulfillmentService.shopifyLocationId,
            supplierInventory,
        );
    });

    await Promise.all(retailerInventoryUpdatePromises);
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
    const supplierShopifyVariantData = await getShopifyVariantData(supplierShopifyVariantIds, supplierSession);
    // We must prevent the products/update webhook from triggering indefinitely
    // in order to do so, we have to check if we need to make a mutation in the first place
    // otherwise, it would constantly call update variant over and over again, and trigger the products/update webhook
    const needsMutation = hasImportantRetailerVariantChanges(
        retailerEditedVariants,
        supplierShopifyVariantData,
        retailerAndSupplierVariantIds,
    );
    if (!needsMutation) {
        return;
    }
    await Promise.all([
        revertRetailerVariantPrices(
            supplierShopifyVariantData,
            retailerAndSupplierVariantIds,
            retailerSession,
            retailerShopifyProductId,
        ),
        revertRetailerVariantInventory(supplierShopifyVariantData, retailerSession, client),
    ]);
}

// ==============================================================================================================
// START: FUNCTIONS TO REVERT RETAILER IMPORTED PRODUCTS PRODUCT STATUS TO MATCH SUPPLIER'S
// ==============================================================================================================
async function revertProductStatus(
    retailerShopifyProductId: string,
    retailerProductStatus: ProductStatus,
    retailerSession: Session,
    supplierSession: Session,
    client: PoolClient,
) {
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

// ==============================================================================================================
// START: MAIN COORDINATOR FUNCTION
// ==============================================================================================================
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

    // there are two potential things that you can be reverted
    // product variants - which related to inventory and price
    // product status - which is the status of the product (active, archived, or draft)
    if (!supplierSession.isAppUninstalled) {
        await Promise.all([
            revertProductVariants(
                retailerShopifyProductId,
                retailerEditedVariants,
                retailerSession,
                supplierSession,
                client,
            ),
            revertProductStatus(
                retailerShopifyProductId,
                retailerProductStatus,
                retailerSession,
                supplierSession,
                client,
            ),
        ]);
        return;
    }

    // case: supplier uninstalled the application but the retailer updates the product on their store
    // we will not be able to call mutations on the supplier's store because their access token is invalid
    // the product status has to be updated back to archived on retailer's store
    // TODO: when the supplier reinstalls the application, we have to resync any price changes the supplier made while the app was uninstalled from the application's code
    if (retailerProductStatus !== PRODUCT_STATUS.ARCHIVED) {
        await updateProductStatusShopify(retailerSession, retailerShopifyProductId, PRODUCT_STATUS.ARCHIVED);
    }
}

export default revertRetailerProductModifications;
