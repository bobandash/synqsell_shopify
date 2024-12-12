import { PoolClient } from 'pg';
import { initializePool } from './db';
import { LineItemDetail, ShopifyEvent } from './types';
import { refundRetailerOrder } from './helper';
import { getSessionFromShop } from '/opt/nodejs/models/session';
import { ORDER_PAYMENT_STATUS } from '/opt/nodejs/constants';

// TODO: I have to store the retailer's order id and handle the retailer cancelling the order as well
// TODO: you can abuse the system; I need to set a check for like 7 days
// checks whether or not we need to process the order and cancel the retailers' fulfillment order
async function isProcessableOrder(shopifyOrderId: string, supplierId: string, client: PoolClient) {
    const orderQuery = `
        SELECT "paymentStatus" FROM "Order"
        WHERE "supplierId" = $1 AND "supplierShopifyOrderId" = $2
        LIMIT 1
    `;
    const orderData = await client.query(orderQuery, [supplierId, shopifyOrderId]);
    if (orderData.rows.length === 0) {
        return false;
    }
    const paymentStatus = orderData.rows[0].paymentStatus as string;
    return paymentStatus !== ORDER_PAYMENT_STATUS.CANCELLED;
}

export const lambdaHandler = async (event: ShopifyEvent) => {
    let client: null | PoolClient = null;

    try {
        const pool = await initializePool();
        client = await pool.connect();
        const shop = event.detail.metadata['X-Shopify-Shop-Domain'];
        const payload = event.detail.payload;
        const shopifyOrderId = payload.admin_graphql_api_id;

        const supplierSession = await getSessionFromShop(shop, client);
        const isRelevantOrder = await isProcessableOrder(shopifyOrderId, supplierSession.id, client);

        if (!isRelevantOrder) {
            console.log(`${shopifyOrderId} is not a processable order.`);
            return;
        }

        const lineItems: LineItemDetail[] = payload.line_items.map((lineItem) => ({
            shopifyLineItemId: lineItem.admin_graphql_api_id,
            quantity: lineItem.quantity,
        }));

        await refundRetailerOrder(shopifyOrderId, lineItems, client);
        console.log(`Refunded order on retailer store for order ${shopifyOrderId}.`);
        return;
    } catch (error) {
        console.error('Failed to run ordersCancelled webhook', error);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};
