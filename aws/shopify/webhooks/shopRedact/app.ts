import { PoolClient } from 'pg';
import { initializePool } from './db';
import { ShopifyEvent } from './types';
import { deleteDataFromShopify, deleteStripeIntegrations } from './helper';
import { deleteSession, getSessionFromShop } from '/opt/nodejs/models/session';
import { logError, logInfo } from '/opt/nodejs/utils/logger';

// this webhook will run 48 hours after the store uninstalls the application
// meant to delete all the data from the database and retailer imported product data
export const lambdaHandler = async (event: ShopifyEvent) => {
    let client: null | PoolClient = null;
    const shop = event.detail.metadata['X-Shopify-Shop-Domain'];
    const webhookId = event.detail.metadata['X-Shopify-Webhook-Id'];
    try {
        logInfo('Start: delete all data from database', {
            shop,
            webhookId,
        });
        const pool = await initializePool();
        client = await pool.connect();
        const session = await getSessionFromShop(shop, client);
        await Promise.all([deleteStripeIntegrations(session.id, client), deleteDataFromShopify(session, client)]);
        await deleteSession(session.id, client);
        logInfo('End: Successfully deleted all data from database', {
            shop,
            webhookId,
        });
        return;
    } catch (error) {
        logError('Failed to delete all data from database', {
            shop,
            webhookId,
        });
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};
