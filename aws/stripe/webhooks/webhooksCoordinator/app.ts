import { Event, StripeSecrets } from './types';
import Stripe from 'stripe';
import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { PoolClient } from 'pg';
import { initializePool } from './db';
import { client, lambda } from './singletons';
import { hasProcessed } from '/opt/nodejs/models/stripeWebhook';

async function getStripeSecrets() {
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
}

async function invokeLambda(functionName: string, payload: any) {
    const params = {
        FunctionName: functionName,
        InvocationType: 'Event',
        Payload: JSON.stringify(payload),
    };
    await lambda.invoke(params).promise();
}

// serves as coordinator from sqs to this function to invoke other lambda functions
export const lambdaHandler = async (event: Event) => {
    let client: null | PoolClient = null;
    const stripeSignature = event.headers['Stripe-Signature'];
    const body = event.body;
    const env = process.env.NODE_ENV ?? 'dev';
    const payload = JSON.parse(body);
    const { id: webhookId, type: webhookTopic } = payload;
    try {
        // resolve webhook signature verification
        const stripeSecrets = await getStripeSecrets();
        const stripe = new Stripe(stripeSecrets.STRIPE_SECRET_API_KEY);
        stripe.webhooks.constructEvent(body, stripeSignature, stripeSecrets.WEBHOOK_SIGNING_SECRET);
        const pool = await initializePool();
        client = await pool.connect();

        const hasProcessedBefore = await hasProcessed(webhookId, client);
        if (hasProcessedBefore) {
            console.log(`Webhook id ${webhookId} has already been processed before.`);
            return;
        }

        switch (webhookTopic) {
            case 'account.application.deauthorized':
                invokeLambda(`${env}_stripe_account_application_deauthorized`, payload);
                break;
            case 'payment_method.detached':
                invokeLambda(`${env}_stripe_payment_method_detached`, payload);
                break;
        }
        console.log('Successfully invoked Stripe function.');
        return;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};
