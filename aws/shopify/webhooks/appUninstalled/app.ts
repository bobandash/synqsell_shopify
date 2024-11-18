import { PoolClient } from 'pg';
import { initializePool } from './db';
import { RolesOptions, Session, ShopifyEvent } from './types';
import { markRetailerProductsArchived, updateUninstalledDb, deleteRetailerImportedProductsDb } from './helper';
import { ROLES } from './constants';

// when the app/uninstalled webhook runs, the access token to use GraphQL's Admin API is already invalidated
// this means that, if the user is a retailer, then there's no possible way to delete the products imported on their store already
// and, if the user is a supplier, you're still able to deactivate/remove the products that your retailers imported because the retailers' access tokens are still valid
// the shop/redact webhook runs after 48 hours of uninstallation, so the app/uninstalled webhook should delete the data necessary but not all the data, in case uninstallation was just a mistake

// current impl is as follows (subject to change):
// for retailers, we will delete all the imported products from the database but keep the products on their Shopify store because we cannot delete it (the access token is invalid)
// if we do not do it this way, then any webhook that mutates the retailer Shopify's data that uninstalled the application (products/update, products/delete, etc.) will throw an error
// unless the isAppUninstalled field in the retailer session's explicitly checked, but as the app grows with more webhooks/impl, missing this check will break the app, so it's better to do this impl

// for suppliers, we will change the status of the retailer's products as archived, and the products/update will make sure the retailer cannot change the archived status in the products/update webhook
// When 48 hours pass for the shop/redact webhook to run, the retailers' imported products will be automatically deleted from their store

async function getSession(shop: string, client: PoolClient) {
    const query = `SELECT * FROM "Session" WHERE shop = $1 LIMIT 1`;
    const sessionData = await client.query(query, [shop]);
    if (sessionData.rows.length === 0) {
        throw new Error('Shop data is invalid.');
    }
    const session = sessionData.rows[0];
    return session as Session;
}

async function hasRole(sessionId: string, role: RolesOptions, client: PoolClient) {
    const query = `
        SELECT * FROM "Role"
        WHERE "name" = $1 AND "sessionId" = $2
        LIMIT 1
    `;
    const res = await client.query(query, [role, sessionId]);
    return res.rows.length > 0;
}

export const lambdaHandler = async (event: ShopifyEvent) => {
    const shop = event.detail['metadata']['X-Shopify-Shop-Domain'];
    let client: null | PoolClient = null;
    try {
        const pool = await initializePool();
        client = await pool.connect();

        const session = await getSession(shop, client);
        const [isSupplier, isRetailer] = await Promise.all([
            hasRole(session.id, ROLES.SUPPLIER, client),
            hasRole(session.id, ROLES.RETAILER, client),
        ]);

        await Promise.all([
            ...(isSupplier ? [markRetailerProductsArchived(session.id, client)] : []),
            ...(isRetailer ? [deleteRetailerImportedProductsDb(session.id, client)] : []),
            updateUninstalledDb(session.id, client),
        ]);
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};
