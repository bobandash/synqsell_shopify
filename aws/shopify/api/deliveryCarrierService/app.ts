import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { PoolClient } from 'pg';
import { RESPONSE } from './constants';
import { ShippingRateRequest } from './types';
import { getShippingRates } from './helper';
import { initializePool } from './db';
import { logError, logInfo } from '/opt/nodejs/utils/logger';

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
        logInfo('Begin: Fetch carrier service rates', {
            sessionId,
        });
        const pool = await initializePool();
        client = await pool.connect();

        const shopifyVariantIds = request.rate.items.map(
            ({ variant_id }) => `gid://shopify/ProductVariant/${variant_id}`,
        );
        const hasImportedItems = await orderHasImportedItems(shopifyVariantIds, client);
        if (!hasImportedItems) {
            logInfo('End: Order has no imported items.', {
                sessionId,
            });
            return RESPONSE.EMPTY;
        }
        const shippingRates = await getShippingRates(sessionId, request, client);
        logInfo('End: Successfully fetched rates.', {
            sessionId,
        });
        return {
            statusCode: 200,
            body: JSON.stringify(shippingRates),
        };
    } catch (error) {
        logError(error, {
            sessionId: sessionId,
            context: 'Failed to get delivery carrier service shipping rates',
        });
        return RESPONSE.BACKUP;
    } finally {
        if (client) {
            client.release();
        }
    }
};
