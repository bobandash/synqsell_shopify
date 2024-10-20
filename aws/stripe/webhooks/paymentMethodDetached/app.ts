import { APIGatewayProxyResult } from 'aws-lambda';
import { PoolClient } from 'pg';
import { initializePool } from './db';
import { Event } from './types';

async function removePaymentMethod(customerId: string, client: PoolClient) {
    try {
        const query = `
            UPDATE "StripeCustomerAccount"
            SET "hasPaymentMethod" = false
            WHERE "stripeCustomerId" = $1
        `;
        await client.query(query, [customerId]);
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to set payment method to false for customer id ${customerId}.`);
    }
}

export const lambdaHandler = async (event: Event): Promise<APIGatewayProxyResult> => {
    let client: null | PoolClient = null;
    const prevCustomerId = event.data.previous_attributes?.customer;

    try {
        const pool = initializePool();
        client = await pool.connect();
        if (prevCustomerId) {
            await removePaymentMethod(prevCustomerId, client);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Successfully removed payment method from customer ${prevCustomerId}.`,
            }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: `Failed to remove payment method from customer ${prevCustomerId}.`,
                error: (error as Error).message,
            }),
        };
    } finally {
        if (client) {
            client.release();
        }
    }
};
