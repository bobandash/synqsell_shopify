import Stripe from 'stripe';
import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { client } from './singletons';

type StripeSecrets = {
    stripeSecretApiKey: string;
};

let stripe: Stripe | null = null;

const getStripeSecrets = async () => {
    const response = await client.send(
        new GetSecretValueCommand({
            SecretId: process.env.API_KEYS_SECRET_ID ?? '',
        }),
    );
    const secretString = response.SecretString;
    if (!secretString) {
        throw new Error('There are no secrets for API keys.');
    }
    const stripeSecrets: StripeSecrets = JSON.parse(secretString);
    if (!stripeSecrets.stripeSecretApiKey) {
        throw new Error('No stripe secret api key exists.');
    }
    return stripeSecrets as StripeSecrets;
};

export async function getStripe() {
    if (stripe) return stripe;
    const stripeSecrets = await getStripeSecrets();

    stripe = new Stripe(stripeSecrets.stripeSecretApiKey, {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        apiVersion: '2023-10-16',
    });

    return stripe;
}

export async function getStripePaymentMethod(customerId: string) {
    const stripe = await getStripe();
    const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
    });
    if (paymentMethods.data.length === 0) {
        throw new Error(`No payment methods exist for customer ${customerId}`);
    }
    return paymentMethods.data[0].id;
}
