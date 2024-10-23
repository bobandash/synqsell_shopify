import Stripe from 'stripe';
import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { client } from './singletons';

type StripeSecrets = {
    stripeSecretApiKey: string;
};

let stripe: Stripe | null = null;

const getStripeSecrets = async () => {
    try {
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
    } catch (error) {
        console.error(error);
        throw new Error('Failed to get stripe secrets');
    }
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
