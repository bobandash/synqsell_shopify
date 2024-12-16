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
    const {
        detail: {
            payload: { id },
        },
    } = event;
    const shopifyProductId = composeGid('Product', id);

    try {
        logInfo('Start: delete product', {
            shop,
            eventDetails: {
                shopifyProductId,
            },
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
        }
        logInfo('End: delete product', {
            eventDetails: {
                shopifyProductId,
            },
        });
        return;
    } catch (error) {
        logError(error, {
            context: `Failed to delete product`,
            shop,
            eventDetails: {
                shopifyProductId,
            },
        });
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};
