import { APIGatewayProxyResult } from 'aws-lambda';
import { PoolClient } from 'pg';
import { initializePool } from './db';
import { ShopifyEvent } from './types';
import { createSupplierOrders, isSynqsellFulfillmentLocation, splitFulfillmentOrderBySupplier } from './helper';
import { RESPONSE } from './constants';

async function getSession(shop: string, client: PoolClient) {
    const sessionQuery = `SELECT * FROM "Session" WHERE shop = $1 LIMIT 1`;
    const sessionData = await client.query(sessionQuery, [shop]);
    if (sessionData.rows.length === 0) {
        throw new Error('Shop data is invalid.');
    }
    const session = sessionData.rows[0];
    return session;
}

// Fulfillment orders are routed by location
// However, there is a case where the same fulfillment orders has different suppliers, and it would have to be split up further
export const lambdaHandler = async (event: ShopifyEvent): Promise<APIGatewayProxyResult> => {
    let client: null | PoolClient = null;
    try {
        const pool = initializePool();
        client = await pool.connect();
        const shop = event.detail.metadata['X-Shopify-Shop-Domain'];
        const shopifyFulfillmentOrderId = event.detail.payload.fulfillment_order.id;
        const retailerSession = await getSession(shop, client);
        const isSynqsellOrder = await isSynqsellFulfillmentLocation(retailerSession, shopifyFulfillmentOrderId, client);
        if (!isSynqsellOrder) {
            return RESPONSE.NOT_SYNQSELL_ORDER;
        }
        const fulfillmentOrdersBySupplier = await splitFulfillmentOrderBySupplier(
            shopifyFulfillmentOrderId,
            retailerSession.shop,
            retailerSession.accessToken,
            client,
        );
        await createSupplierOrders(fulfillmentOrdersBySupplier, shopifyFulfillmentOrderId, retailerSession, client);
        return RESPONSE.SUCCESS;
    } catch (err) {
        console.error(err);
        return RESPONSE.FAILURE;
    } finally {
        if (client) {
            client.release();
        }
    }
};
