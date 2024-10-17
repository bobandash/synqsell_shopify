import { APIGatewayProxyResult } from 'aws-lambda';
import { PoolClient } from 'pg';
import { initializePool } from './db';
import { ROLES, Session, ShopifyEvent } from './types';
import { markRetailerProductsArchived, updateAppUninstalledStatus } from './helper';

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

async function isSupplier(sessionId: string, client: PoolClient) {
    try {
        const query = `
            SELECT * FROM "Role"
            WHERE "name" = $1 AND "sessionId" = $2
            LIMIT 1
        `;
        const res = await client.query(query, [ROLES.SUPPLIER, sessionId]);
        return res.rows.length > 0;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to check if session id ${sessionId} is a supplier.`);
    }
}

// when the app/uninstalled webhook runs, the access token is already invalidated
// so this webhook topic should just handle forcing all the retailer product status's to draft and updating all db entries
// current impl: retailers have to make sure to delete all the products they import before uninstalling because the retailer's access token will be invalidated
// while the supplier has to change the status of the retailer's products as archived,
// have the retailer either delete their product OR wait 48 hours for the shop/redact webhook to run and automatically delete the product from their store
export const lambdaHandler = async (event: ShopifyEvent): Promise<APIGatewayProxyResult> => {
    const shop = event.detail['metadata']['X-Shopify-Shop-Domain'];
    let client: null | PoolClient = null;
    try {
        const pool = initializePool();
        client = await pool.connect();

        const session = await getSession(shop, client);
        const isUserSupplier = await isSupplier(session.id, client);

        if (isUserSupplier) {
            await markRetailerProductsArchived(session.id, client);
        }
        await updateAppUninstalledStatus(session.id, client);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Successfully handled uninstall webhook for shop ${shop}.`,
            }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: `Could not handle uninstall webhook for shop ${shop}.`,
                error: (error as Error).message,
            }),
        };
    } finally {
        if (client) {
            client.release();
        }
    }
};
