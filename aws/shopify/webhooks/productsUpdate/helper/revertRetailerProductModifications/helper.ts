import { PoolClient } from 'pg';
import { EditedVariant } from '../../types';
import type { Session } from '/opt/nodejs/models/types';
import { ProductVariantInfoQuery } from '../../types/admin.generated';
import { createMapIdToRestObj } from '/opt/nodejs/utils';
import { getFulfillmentService } from '/opt/nodejs/models/fulfillmentService';
import { updateInventoryShopify, updateVariantShopify } from '../util/graphql';

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
            throw new Error(`Retailer variant does not exist for supplier variant id ${supplierVariantId}.`);
        }
        return {
            id: retailerVariantId,
            price: supplierPrice,
        };
    });
    await updateVariantShopify(retailerSession, importedShopifyProductId, input);
}

async function getSupplierVariantIdToRetailerInventoryItemId(
    supplierVariantIds: string[],
    retailerId: string,
    client: PoolClient,
) {
    const query = `
        SELECT 
            "Variant"."shopifyVariantId" AS "supplierVariantId",
            "ImportedInventoryItem"."shopifyInventoryItemId" AS "retailerShopifyInventoryItemId"  
        FROM "Variant" 
        INNER JOIN "ImportedVariant" ON "ImportedVariant"."prismaVariantId" = "Variant"."id"
        INNER JOIN "ImportedProduct" ON "ImportedProduct"."id" = "ImportedVariant"."importedProductId"
        INNER JOIN "ImportedInventoryItem" ON "ImportedInventoryItem"."importedVariantId" = "ImportedVariant"."id"
        WHERE 
            "Variant"."shopifyVariantId" = ANY($1) AND
            "ImportedProduct"."retailerId" = $2
    `;
    const res = await client.query(query, [supplierVariantIds, retailerId]);
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
        retailerSession.id,
        client,
    );

    const retailerInventoryUpdatePromises = supplierShopifyVariantData.map(({ productVariant }) => {
        const supplierVariantId = productVariant?.id ?? '';
        const supplierInventory = productVariant?.inventoryQuantity;
        const retailerShopifyInventoryItemId =
            supplierVariantIdToRetailerShopifyInventoryId.get(supplierVariantId)?.retailerShopifyInventoryItemId;
        if (!retailerShopifyInventoryItemId || !supplierInventory) {
            return;
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

export {
    getRetailerAndSupplierVariantIds,
    hasImportantRetailerVariantChanges,
    revertRetailerVariantPrices,
    revertRetailerVariantInventory,
};

export const exportsForTesting =
    process.env.NODE_ENV === 'test'
        ? {
              getRetailerAndSupplierVariantIds,
              hasImportantRetailerVariantChanges,
              revertRetailerVariantPrices,
              getSupplierVariantIdToRetailerInventoryItemId,
              revertRetailerVariantInventory,
          }
        : undefined;
