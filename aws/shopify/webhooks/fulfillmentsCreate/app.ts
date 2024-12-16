import { PoolClient } from 'pg';
import { initializePool } from './db';
import { ShopifyEvent } from './types';
import { composeGid } from '@shopify/admin-graphql-api-utilities';
import { createRetailerFulfillment } from './helper';
import { getSessionFromShop } from '/opt/nodejs/models/session';
import { isOrder } from '/opt/nodejs/models/order';
import { logError, logInfo } from '/opt/nodejs/utils/logger';

export const lambdaHandler = async (event: ShopifyEvent) => {
    let client: null | PoolClient = null;
    const {
        payload: { order_id: orderId, id: fulfillmentId },
        metadata: { 'X-Shopify-Shop-Domain': shop },
    } = event.detail;
    const shopifyOrderId = composeGid('Order', orderId);
    const shopifyFulfillmentId = composeGid('Fulfillment', fulfillmentId);
    try {
        logInfo('Start: Create fulfillment for retailer', {
            shop,
            eventDetails: {
                shopifyOrderId,
                shopifyFulfillmentId,
            },
        });
        const pool = await initializePool();
        client = await pool.connect();
        const supplierSession = await getSessionFromShop(shop, client);
        const isSynqSellOrder = await isOrder(shopifyOrderId, supplierSession.id, client);
        if (!isSynqSellOrder) {
            logInfo('End: Order is not a SynqSell order.', {
                shop,
                eventDetails: {
                    shopifyOrderId,
                    shopifyFulfillmentId,
                },
            });
            return;
        }
        await createRetailerFulfillment(shopifyFulfillmentId, shopifyOrderId, supplierSession, client);
        logInfo('End: Successfully fulfilled order for retailer.', {
            shop,
            eventDetails: {
                shopifyOrderId,
                shopifyFulfillmentId,
            },
        });
        return;
    } catch (error) {
        logError(error, {
            context: 'Failed to fulfil order for retailer.',
            shop,
            eventDetails: {
                shopifyOrderId,
                shopifyFulfillmentId,
            },
        });
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};
