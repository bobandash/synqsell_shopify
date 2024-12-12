import { PoolClient } from 'pg';
import { initializePool } from './db';
import { ShopifyEvent } from './types';
import { markRetailerProductsArchived } from './helper';
import { ROLES } from '/opt/nodejs/constants';
import { deleteAllImportedProducts } from '/opt/nodejs/models/importedProduct';
import { getSessionFromShop, updateUninstalledStatus } from '/opt/nodejs/models/session';
import { hasRole } from '/opt/nodejs/models/role';
import { deleteBilling } from '/opt/nodejs/models/billing';

export const lambdaHandler = async (event: ShopifyEvent) => {
    const shop = event.detail.metadata['X-Shopify-Shop-Domain'];
    let client: null | PoolClient = null;
    try {
        const pool = await initializePool();
        client = await pool.connect();
        const session = await getSessionFromShop(shop, client);
        const [isSupplier, isRetailer] = await Promise.all([
            hasRole(session.id, ROLES.SUPPLIER, client),
            hasRole(session.id, ROLES.RETAILER, client),
        ]);
        await Promise.all([
            ...(isSupplier ? [markRetailerProductsArchived(session.id, client)] : []),
            ...(isRetailer ? [deleteAllImportedProducts(session.id, client)] : []),
            deleteBilling(session.id, client),
            updateUninstalledStatus(session.id, false, client),
        ]);
        console.log(`Successfully uninstalled application for ${shop}.`);
    } catch (error) {
        console.error(`Failed to uninstall app for shop ${shop}.`, error);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};
