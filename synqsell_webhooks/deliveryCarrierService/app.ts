import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PoolClient } from 'pg';
import { composeGid } from '@shopify/admin-graphql-api-utilities';
import initializePool from './db';
import { BackupResponse, EmptyResponse, SampleResponse } from './constants';
import { Session, ShippingRateRequest } from './types';

// https://shopify.dev/docs/api/admin-graphql/2024-07/objects/DeliveryCarrierService
async function hasSynqSellItems(shopifyVariantIds: string[], client: PoolClient) {
    const numImportedVariantsQuery = `SELECT COUNT(*) FROM "ImportedVariant" WHERE "shopifyVariantId" IN ANY($1)`;
    const res = await client.query(numImportedVariantsQuery, shopifyVariantIds);
    const count = parseInt(res.rows[0].count);
    return count > 0;
}

// async function getSession(sessionId: string, client: PoolClient) {
//     try {
//         const sessionQuery = `SELECT * FROM "Session" WHERE "id" = $1`;
//         const res = await client.query(sessionQuery, [sessionId]);
//         const session: Session = res.rows[0];
//         return session;
//     } catch (error) {
//         throw new Error('Failed to get session ' + sessionId);
//     }
// }

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const storeId = event.queryStringParameters?.storeId;
    let client: null | PoolClient = null;
    try {
        const pool = initializePool();
        client = await pool.connect();
        const request: ShippingRateRequest | null = event.body ? JSON.parse(event.body) : null;
        if (!request) {
            return EmptyResponse;
        }

        const shopifyImportedVariantIds = request.rate.items.map(({ variant_id }) =>
            composeGid('ProductVariant', variant_id),
        );

        const orderHasSynqSellItems = await hasSynqSellItems(shopifyImportedVariantIds, client);
        if (!orderHasSynqSellItems) {
            return EmptyResponse;
        }

        return SampleResponse;
    } catch (err) {
        return BackupResponse;
    } finally {
        if (client) {
            client.release();
        }
    }
};
