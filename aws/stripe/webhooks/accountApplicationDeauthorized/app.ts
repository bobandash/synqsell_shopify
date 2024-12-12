import { PoolClient } from 'pg';
import { initializePool } from './db';
import { Event } from './types';
import { deleteStripeConnectAccount } from '/opt/nodejs/models/stripeConnectAccount';
import { hasProcessed, processWebhook } from '/opt/nodejs/models/stripeWebhook';

export const lambdaHandler = async (event: Event) => {
    let client: null | PoolClient = null;
    const accountId = event.account;
    const webhookId = event.id;
    try {
        const pool = await initializePool();
        client = await pool.connect();
        const hasProcessedBefore = await hasProcessed(webhookId, client);
        if (hasProcessedBefore) {
            console.log('Webhook ${webhookId} has already been processed before.');
            return;
        }

        await deleteStripeConnectAccount(accountId, client);
        await processWebhook(webhookId, client);
        console.log(`Successfully deleted stripe account ${accountId} from database.`);
        return;
    } catch (error) {
        console.error(`Failed to delete stripe account ${accountId} from database.`, error);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};
