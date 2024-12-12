import { composeGid } from '@shopify/admin-graphql-api-utilities';
import { PoolClient } from 'pg';
import { isProduct } from '/opt/nodejs/models/product';
import { deleteImportedProduct, isImportedProduct } from '/opt/nodejs/models/importedProduct';
import { initializePool } from './db';
import { ShopifyEvent } from './types';
import { handleDeletedSupplierProduct } from './helper';

export const lambdaHandler = async (event: ShopifyEvent) => {
    let client: null | PoolClient = null;
    try {
        const pool = await initializePool();
        const {
            detail: {
                payload: { id },
            },
        } = event;
        const shopifyProductId = composeGid('Product', id);
        client = await pool.connect();

        const [isRetailerProduct, isSupplierProduct] = await Promise.all([
            isImportedProduct(shopifyProductId, client),
            isProduct(shopifyProductId, client),
        ]);

        if (!isRetailerProduct && !isSupplierProduct) {
        } else if (isSupplierProduct) {
            await handleDeletedSupplierProduct(shopifyProductId, client);
        } else if (isRetailerProduct) {
            await deleteImportedProduct(shopifyProductId, client);
        }
        console.log(`Successfully handled product deletion ${shopifyProductId}.`);
        return;
    } catch (error) {
        console.error('Failed to delete product.', error);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};
