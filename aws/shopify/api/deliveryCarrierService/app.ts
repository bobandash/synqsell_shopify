import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { PoolClient } from 'pg';
import { RESPONSE } from './constants';
import { ShippingRateRequest } from './types';
import { getShippingRates } from './helper';
import { initializePool } from './db';
import { composeGid } from '@shopify/admin-graphql-api-utilities';

async function orderHasImportedItems(shopifyVariantIds: string[], client: PoolClient) {
    const query = `SELECT COUNT(*) FROM "ImportedVariant" WHERE "shopifyVariantId" = ANY($1)`;
    const res = await client.query(query, [shopifyVariantIds]);
    const count = parseInt(res.rows[0].count);
    return count > 0;
}

// https://shopify.dev/docs/api/admin-graphql/2024-07/objects/DeliveryCarrierService
export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    let client: null | PoolClient = null;
    const request: ShippingRateRequest | null = event.body ? JSON.parse(event.body) : null;
    const sessionId = event.queryStringParameters?.sessionId ?? null;

    if (!request || !sessionId) {
        return RESPONSE.EMPTY;
    }
    try {
        const pool = await initializePool();
        client = await pool.connect();

        const shopifyVariantIds = request.rate.items.map(({ variant_id }) => composeGid('ProductVariant', variant_id));
        const hasImportedItems = await orderHasImportedItems(shopifyVariantIds, client);
        if (!hasImportedItems) {
            return RESPONSE.EMPTY;
        }
        const shippingRates = await getShippingRates(sessionId, request, client);

        return {
            statusCode: 200,
            body: JSON.stringify(shippingRates),
        };
    } catch (error) {
        console.error('Failed to get delivery carrier service shipping rates', error);
        return RESPONSE.BACKUP;
    } finally {
        if (client) {
            client.release();
        }
    }
};
