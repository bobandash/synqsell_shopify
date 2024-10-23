import { APIGatewayProxyResult } from 'aws-lambda';
import { PoolClient } from 'pg';
import { initializePool } from './db';
import { Event } from './types';

async function removeStripeAccountFromDatabase(accountId: string, client: PoolClient) {
    try {
        const query = `
            DELETE FROM "StripeConnectAccount"
            WHERE "stripeAccountId" = $1
        `;
        await client.query(query, [accountId]);
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to remove stripe account ${accountId} from database.`);
    }
}

export const lambdaHandler = async (event: Event): Promise<APIGatewayProxyResult> => {
    let client: null | PoolClient = null;
    const accountId = event.account;

    try {
        const pool = await initializePool();
        client = await pool.connect();
        await removeStripeAccountFromDatabase(accountId, client);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Successfully removed account ${accountId}.`,
            }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: `Failed to remove account ${accountId} from database.`,
                error: (error as Error).message,
            }),
        };
    } finally {
        if (client) {
            client.release();
        }
    }
};
