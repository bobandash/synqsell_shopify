import { PoolClient } from 'pg';
import { initializePool } from './db';
import { Event } from './types';
import { updatePaymentMethodStatus } from '/opt/nodejs/models/stripeCustomerAccount';
import { hasProcessed, processWebhook } from '/opt/nodejs/models/stripeWebhook';
import { logError, logInfo } from '/opt/nodejs/utils/logger';

export const lambdaHandler = async (event: Event) => {
    let client: null | PoolClient = null;
    const prevCustomerId = event.data.previous_attributes?.customer;
    const webhookId = event.id;
    const eventDetails = {
        prevCustomerId,
    };

    try {
        logInfo('Start: Detach payment method from stripe payments.', { webhookId, eventDetails });
        const pool = await initializePool();
        client = await pool.connect();
        const hasProcessedBefore = await hasProcessed(webhookId, client);
        if (hasProcessedBefore) {
            logInfo('End: Webhook has already been processed.', { webhookId, eventDetails });
            return;
        }

        if (prevCustomerId) {
            await updatePaymentMethodStatus(prevCustomerId, false, client);
        }
        await processWebhook(webhookId, client);
        logInfo('Successfully detached payment method status from stripe payments.', { webhookId, eventDetails });
        return;
    } catch (error) {
        logError(error, {
            context: 'Failed to detach payment method from stripe payments',
            eventDetails,
        });
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};
