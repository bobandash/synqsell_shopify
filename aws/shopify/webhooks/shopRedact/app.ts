import { APIGatewayProxyResult } from 'aws-lambda';
import { PoolClient } from 'pg';
import { initializePool } from './db';
import { Session, ShopifyEvent } from './types';
import { deleteAllDataFromDb, deleteDataFromShopify, deleteStripeIntegrations } from './helper';

async function getSession(shop: string, client: PoolClient) {
    try {
        const query = `SELECT * FROM "Session" WHERE shop = $1 LIMIT 1`;
        const sessionData = await client.query(query, [shop]);
        if (sessionData.rows.length === 0) {
            throw new Error('Shop data is invalid.');
        }
        const session = sessionData.rows[0];
        return session as Session;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to retrieve session from shop ${shop}.`);
    }
}

// this webhook will run 48 hours after the store uninstalls the application
// meant to delete all the data from the database and retailer imported product data
export const lambdaHandler = async (event: ShopifyEvent): Promise<APIGatewayProxyResult> => {
    let client: null | PoolClient = null;
    const shop = event.detail.metadata['X-Shopify-Shop-Domain'];
    try {
        const pool = initializePool();
        client = await pool.connect();
        const session = await getSession(shop, client);

        await Promise.all([deleteStripeIntegrations(session.id, client), deleteDataFromShopify(session, client)]);

        // note: deleting the db has to be last because all the external apis fetch data from the database
        await deleteAllDataFromDb(session.id, client);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Successfully deleted all data related to ${shop}.`,
            }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: `Could not permanently delete all data related to ${shop}.`,
                error: (error as Error).message,
            }),
        };
    } finally {
        if (client) {
            client.release();
        }
    }
};
