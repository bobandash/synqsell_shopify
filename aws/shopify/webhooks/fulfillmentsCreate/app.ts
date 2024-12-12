import { PoolClient } from 'pg';
import { initializePool } from './db';
import { ShopifyEvent } from './types';
import { composeGid } from '@shopify/admin-graphql-api-utilities';
import { createRetailerFulfillment } from './helper';
import { getSessionFromShop } from '/opt/nodejs/models/session';
import { isOrder } from '/opt/nodejs/models/order';

export const lambdaHandler = async (event: ShopifyEvent) => {
    let client: null | PoolClient = null;
    try {
        const pool = await initializePool();
        client = await pool.connect();
        const {
            payload: { order_id: orderId, id: fulfillmentId },
            metadata: { 'X-Shopify-Shop-Domain': shop },
        } = event.detail;

        const shopifyOrderId = composeGid('Order', orderId);
        const shopifyFulfillmentId = composeGid('Fulfillment', fulfillmentId);

        const supplierSession = await getSessionFromShop(shop, client);
        const isSynqSellOrder = await isOrder(shopifyOrderId, supplierSession.id, client);
        if (!isSynqSellOrder) {
            console.log(`This order ${shopifyOrderId} is not a SynqSell order.`);
            return;
        }
        await createRetailerFulfillment(shopifyFulfillmentId, shopifyOrderId, supplierSession, client);
        console.log(`Successfully fulfilled order for retailer ${shopifyOrderId}.`);
        return;
    } catch (error) {
        console.error('Failed to fulfil order for retailer', error);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};
