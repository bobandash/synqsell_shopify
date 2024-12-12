import { PoolClient } from 'pg';
import { initializePool } from './db';
import { Session, ShopifyEvent } from './types';
import { deleteDataFromShopify, deleteStripeIntegrations } from './helper';
import { deleteSession, getSessionFromShop } from '/opt/nodejs/models/session';

// this webhook will run 48 hours after the store uninstalls the application
// meant to delete all the data from the database and retailer imported product data
export const lambdaHandler = async (event: ShopifyEvent) => {
    let client: null | PoolClient = null;
    const shop = event.detail.metadata['X-Shopify-Shop-Domain'];
    try {
        const pool = await initializePool();
        client = await pool.connect();
        const session = await getSessionFromShop(shop, client);
        await Promise.all([deleteStripeIntegrations(session.id, client), deleteDataFromShopify(session, client)]);
        await deleteSession(session.id, client);
        console.log(`Successfully removed store ${shop} from application.`);
        return;
    } catch (error) {
        console.error(`Failed to remove ${shop} from application`, error);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};
