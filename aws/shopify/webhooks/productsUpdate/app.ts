import { PoolClient } from 'pg';
import { initializePool } from './db';
import { composeGid } from '@shopify/admin-graphql-api-utilities';
import { broadcastSupplierProductModifications, revertRetailerProductModifications } from './helper';
import { ProductStatus, ShopifyEvent } from './types';
import { isImportedProduct } from '/opt/nodejs/models/importedProduct';
import { isProduct } from '/opt/nodejs/models/product';
import { logError, logInfo } from '/opt/nodejs/utils/logger';

export const lambdaHandler = async (event: ShopifyEvent) => {
    let client: null | PoolClient = null;
    const payload = event.detail.payload;
    const shopifyProductId = payload.admin_graphql_api_id;
    const newProductStatus = payload.status.toUpperCase() as ProductStatus;
    const editedVariants = payload.variants.map((variant) => ({
        shopifyVariantId: composeGid('ProductVariant', variant.id),
        hasUpdatedInventory: variant.inventory_quantity !== variant.old_inventory_quantity,
        newInventory: variant.inventory_quantity,
        price: variant.price,
    }));
    const shop = event.detail.metadata['X-Shopify-Shop-Domain'];
    const eventDetails = {
        shopifyProductId,
    };
    try {
        logInfo('Start: Update product details', {
            shop,
            eventDetails,
        });
        const pool = await initializePool();
        client = await pool.connect();
        const [isRetailerProduct, isSupplierProduct] = await Promise.all([
            isImportedProduct(shopifyProductId, client),
            isProduct(shopifyProductId, client),
        ]);

        if (!isSupplierProduct && !isRetailerProduct) {
            logInfo('End: Not a product on SynqSell', {
                shop,
                eventDetails,
            });
            return;
        }

        // there is no old price, so we cannot check if the variant price has been updated
        // even though it consumes GraphQL resources, we are going to broadcast the price changes

        if (isSupplierProduct) {
            await broadcastSupplierProductModifications(editedVariants, shopifyProductId, newProductStatus, client);
        } else if (isRetailerProduct) {
            await revertRetailerProductModifications(shopifyProductId, editedVariants, newProductStatus, client);
        }
        logInfo('End: Successfully updated product details.', {
            shop,
            eventDetails,
        });
        return;
    } catch (error) {
        logError(error, {
            shop,
            context: 'Failed to update product for either retailer or supplier.',
            eventDetails,
        });
        return;
    } finally {
        if (client) {
            client.release();
        }
    }
};
