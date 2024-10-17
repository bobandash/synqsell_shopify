import { APIGatewayProxyResult } from 'aws-lambda';
import { PoolClient } from 'pg';
import { initializePool } from './db';
import { Session, ShopifyEvent } from './types';
import { deleteDataFromDb, deleteDataFromShopify } from './helper';

// this webhook will run 48 hours after the store uninstalls the application
// meant to delete all the data from the database and retailer imported product data

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

export const lambdaHandler = async (event: ShopifyEvent): Promise<APIGatewayProxyResult> => {
    let client: null | PoolClient = null;

    const shop = event.detail.metadata['X-Shopify-Shop-Domain'];
    try {
        const pool = initializePool();
        client = await pool.connect();
        const session = await getSession(shop, client);
        await Promise.all([deleteDataFromShopify(session), deleteDataFromDb(session)]);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Successfully did procedure.',
            }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Could not delete products.',
                error: (error as Error).message,
            }),
        };
    } finally {
        if (client) {
            client.release();
        }
    }
};
