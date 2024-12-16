import { PoolClient } from 'pg';
import { initializePool } from './db';
import { LineItemDetail, ShopifyEvent } from './types';
import { refundRetailerOrder } from './helper';
import { getSessionFromShop } from '/opt/nodejs/models/session';
import { ORDER_PAYMENT_STATUS } from '/opt/nodejs/constants';
import { logError, logInfo } from '/opt/nodejs/utils/logger';

// TODO: I have to store the retailer's order id and handle the retailer cancelling the order as well
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
    const shop = event.detail.metadata['X-Shopify-Shop-Domain'];
    const payload = event.detail.payload;
    const shopifyOrderId = payload.admin_graphql_api_id;
    const eventDetails = {
        shopifyOrderId,
    };
    try {
        logInfo('Start: Handle order cancellation.', {
            shop,
            eventDetails: {
                shopifyOrderId,
            },
        });
        const pool = await initializePool();
        client = await pool.connect();
        const supplierSession = await getSessionFromShop(shop, client);
        const isRelevantOrder = await isProcessableOrder(shopifyOrderId, supplierSession.id, client);

        if (!isRelevantOrder) {
            logInfo('End: Order is not relevant (no need to refund on for retailer).', {
                shop,
                eventDetails,
            });
            return;
        }

        const lineItems: LineItemDetail[] = payload.line_items.map((lineItem) => ({
            shopifyLineItemId: lineItem.admin_graphql_api_id,
            quantity: lineItem.quantity,
        }));

        await refundRetailerOrder(shopifyOrderId, lineItems, client);
        logInfo('End: Successfully refunded order on retailer store.', {
            shop,
            eventDetails,
        });
        return;
    } catch (error) {
        logError(error, {
            context: 'Failed to refund order on retailer store',
            shop,
            eventDetails,
        });
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};
