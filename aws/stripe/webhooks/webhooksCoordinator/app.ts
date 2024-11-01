import { Event, StripeSecrets } from './types';
import Stripe from 'stripe';
import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { PoolClient } from 'pg';
import { initializePool } from './db';
import { client, lambda } from './singletons';

async function getStripeSecrets() {
    try {
        const response = await client.send(
            new GetSecretValueCommand({
                SecretId: process.env.STRIPE_SECRET_ARN ?? '',
            }),
        );
        const secretString = response.SecretString;
        if (!secretString) {
            throw new Error('There are no secrets inside secret string.');
        }
        const stripeSecrets = JSON.parse(secretString);
        return stripeSecrets as StripeSecrets;
    } catch (error) {
        console.error(error);
        throw new Error('failed to get stripe secrets');
    }
}

async function invokeLambda(functionName: string, payload: any) {
    const params = {
        FunctionName: functionName,
        InvocationType: 'Event',
        Payload: JSON.stringify(payload),
    };
    try {
        await lambda.invoke(params).promise();
    } catch (error) {
        console.error(error);
        console.error(payload);
        console.error(`Error invoking ${functionName}.`);
    }
}

async function hasProcessedWebhookBefore(id: string, client: PoolClient) {
    try {
        const query = `
            SELECT * FROM "StripeWebhook"
            WHERE id = $1
        `;
        const res = await client.query(query, [id]);
        return res.rows.length > 0;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to check if webhook ${id} has been processed before.`);
    }
}

async function addWebhookToProcessed(id: string, client: PoolClient) {
    try {
        const query = `
            INSERT INTO "StripeWebhook" (id) 
            VALUES ($1)
        `;
        const res = await client.query(query, [id]);
        return res.rows.length > 0;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to check if webhook ${id} has been processed before.`);
    }
}

// serves as coordinator from sqs to this function to invoke other lambda functions
export const lambdaHandler = async (event: Event) => {
    let client: null | PoolClient = null;
    const stripeSignature = event.headers['Stripe-Signature'];
    const body = event.body;
    const env = process.env.NODE_ENV ?? 'dev';

    try {
        const payload = JSON.parse(body);
        const { id: webhookId, type: webhookTopic } = payload;
        // resolve webhook signature verification
        const stripeSecrets = await getStripeSecrets();
        const stripe = new Stripe(stripeSecrets.STRIPE_SECRET_API_KEY);
        stripe.webhooks.constructEvent(body, stripeSignature, stripeSecrets.WEBHOOK_SIGNING_SECRET);

        const pool = await initializePool();
        client = await pool.connect();

        const hasProcessedBefore = await hasProcessedWebhookBefore(webhookId, client);
        if (hasProcessedBefore) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: `The webhook ${webhookId} with topic ${webhookTopic} has already been processed before.`,
                }),
            };
        }

        await addWebhookToProcessed(webhookId, client);
        switch (webhookTopic) {
            case 'account.application.deauthorized':
                invokeLambda(`${env}_stripe_account_application_deauthorized`, payload);
                break;
            case 'payment_method.detached':
                invokeLambda(`${env}_stripe_payment_method_detached`, payload);
                break;
            default:
                return {
                    statusCode: 501,
                    body: JSON.stringify({
                        message: `This webhook topic ${webhookTopic} is not handled by the coordinator function.`,
                    }),
                };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Successfully invoked webhook topic.`,
            }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to coordinate Stripe webhook with handling logic.',
            }),
        };
    } finally {
        if (client) {
            client.release();
        }
    }
};
