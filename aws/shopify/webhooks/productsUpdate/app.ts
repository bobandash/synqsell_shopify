import { PoolClient } from 'pg';
import { initializePool } from './db';
import { composeGid } from '@shopify/admin-graphql-api-utilities';
import { broadcastSupplierProductModifications, revertRetailerProductModifications } from './helper';
import { ProductStatus, ShopifyEvent } from './types';
import { isImportedProduct } from '/opt/nodejs/models/importedProduct';
import { isProduct } from '/opt/nodejs/models/product';

export const lambdaHandler = async (event: ShopifyEvent) => {
    let client: null | PoolClient = null;
    try {
        const pool = await initializePool();
        client = await pool.connect();
        const payload = event.detail.payload;
        const shopifyProductId = payload.admin_graphql_api_id;
        const [isRetailerProduct, isSupplierProduct] = await Promise.all([
            isImportedProduct(shopifyProductId, client),
            isProduct(shopifyProductId, client),
        ]);

        if (!isSupplierProduct && !isRetailerProduct) {
            console.log(`${shopifyProductId} is not a product on SynqSell`);
            return;
        }

        // there is no old price, so we cannot check if the variant price has been updated
        // even though it consumes GraphQL resources, we are going to broadcast the price changes
        const newProductStatus = payload.status.toUpperCase() as ProductStatus;
        const editedVariants = payload.variants.map((variant) => ({
            shopifyVariantId: composeGid('ProductVariant', variant.id),
            hasUpdatedInventory: variant.inventory_quantity !== variant.old_inventory_quantity,
            newInventory: variant.inventory_quantity,
            price: variant.price,
        }));

        if (isSupplierProduct) {
            await broadcastSupplierProductModifications(editedVariants, shopifyProductId, newProductStatus, client);
            console.log(`Successfully broadcasted changes from ${shopifyProductId} to retailers.`);
        } else if (isRetailerProduct) {
            await revertRetailerProductModifications(shopifyProductId, editedVariants, newProductStatus, client);
            console.log(`Successfully reverted retailer product modifications for ${shopifyProductId}.`);
        }

        return;
    } catch (error) {
        console.error('Failed to handle productsUpdate webhook', error);
        return;
    } finally {
        if (client) {
            client.release();
        }
    }
};
