import { PoolClient } from 'pg';
import { initializePool } from './db';
import { Event } from './types';
import { updatePaymentMethodStatus } from '/opt/nodejs/models/stripeCustomerAccount';
import { hasProcessed, processWebhook } from '/opt/nodejs/models/stripeWebhook';

export const lambdaHandler = async (event: Event) => {
    let client: null | PoolClient = null;
    const prevCustomerId = event.data.previous_attributes?.customer;
    const webhookId = event.id;
    try {
        const pool = await initializePool();
        client = await pool.connect();

        const hasProcessedBefore = await hasProcessed(webhookId, client);
        if (hasProcessedBefore) {
            console.log('Webhook ${webhookId} has already been processed before.');
            return;
        }

        if (prevCustomerId) {
            await updatePaymentMethodStatus(prevCustomerId, false, client);
        }
        await processWebhook(webhookId, client);
        console.log('Successfully updated payment method status.');
        return;
    } catch (error) {
        console.error(`Failed to update payment method status for customer id ${prevCustomerId}`, error);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};
