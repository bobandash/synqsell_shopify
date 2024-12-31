import { composeGid } from '@shopify/admin-graphql-api-utilities';
import { PoolClient } from 'pg';
import { isProduct } from '/opt/nodejs/models/product';
import { deleteImportedProduct, isImportedProduct } from '/opt/nodejs/models/importedProduct';
import { initializePool } from './db';
import { ShopifyEvent } from './types';
import { handleDeletedSupplierProduct } from './helper';
import { logError, logInfo } from '/opt/nodejs/utils/logger';

export const lambdaHandler = async (event: ShopifyEvent) => {
    let client: null | PoolClient = null;
    const shop = event.detail.metadata['X-Shopify-Shop-Domain'];
    const webhookId = event.detail.metadata['X-Shopify-Webhook-Id'];
    const {
        detail: {
            payload: { id },
        },
    } = event;
    const shopifyProductId = composeGid('Product', id);

    try {
        logInfo('Start: delete product', {
            shop,
            webhookId,
        });

        const pool = await initializePool();

        client = await pool.connect();

        const [isRetailerProduct, isSupplierProduct] = await Promise.all([
            isImportedProduct(shopifyProductId, client),
            isProduct(shopifyProductId, client),
        ]);

        if (isSupplierProduct) {
            await handleDeletedSupplierProduct(shopifyProductId, client);
        } else if (isRetailerProduct) {
            await deleteImportedProduct(shopifyProductId, client);
        } else {
            logInfo('End: product deleted is not a SynqSell product', {
                webhookId,
            });
            return;
        }
        logInfo('End: delete product', {
            webhookId,
        });
        return;
    } catch (error) {
        logError(error, {
            context: `Failed to delete product`,
            webhookId,
        });
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};
