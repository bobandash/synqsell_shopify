import { PoolClient } from 'pg';
import { initializePool } from './db';
import { Event } from './types';
import { deleteStripeConnectAccount } from '/opt/nodejs/models/stripeConnectAccount';
import { hasProcessed, processWebhook } from '/opt/nodejs/models/stripeWebhook';
import { logError, logInfo } from '/opt/nodejs/utils/logger';

export const lambdaHandler = async (event: Event) => {
    let client: null | PoolClient = null;
    const accountId = event.account;
    const webhookId = event.id;
    try {
        logInfo('Start: Delete stripe connect account from database.', { accountId, webhookId });
        const pool = await initializePool();
        client = await pool.connect();
        const hasProcessedBefore = await hasProcessed(webhookId, client);
        if (hasProcessedBefore) {
            logInfo('End: Webhook has already been processed.', { accountId, webhookId });
            return;
        }
        await deleteStripeConnectAccount(accountId, client);
        await processWebhook(webhookId, client);
        logInfo('End: Successfully deleted stripe connect account from database.', { accountId, webhookId });
        return;
    } catch (error) {
        logError(error, {
            context: 'Failed to delete stripe account from database',
            webhookId,
            accountId,
        });
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};
