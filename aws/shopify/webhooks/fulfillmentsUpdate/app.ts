import { PoolClient } from 'pg';
import { initializePool } from './db';
import { ShopifyEvent } from './types';
import { cancelRetailerFulfillment, handlePaymentForDeliveredOrder, resyncRetailerFulfillment } from './helper';
import { composeGid } from '@shopify/admin-graphql-api-utilities';
import { ROLES } from '/opt/nodejs/constants';
import { logError, logInfo } from '/opt/nodejs/utils/logger';
import { hasPayment, isProcessableFulfillment } from './util';

// This function listens to when the fulfillment ever updates
// fulfillment includes: fulfillment / tracking number being cancelled and shipment status changing
// https://shopify.dev/docs/api/admin-rest/2024-07/resources/fulfillment#put-orders-order-id-fulfillments-fulfillment-id

export const lambdaHandler = async (event: ShopifyEvent) => {
    let client: null | PoolClient = null;
    const payload = event.detail.payload;
    const shop = event.detail.metadata['X-Shopify-Shop-Domain'];
    const webhookId = event.detail.metadata['X-Shopify-Webhook-Id'];
    const {
        status: fulfillmentStatus,
        shipment_status: shipmentStatus,
        order_id: rawOrderId,
        admin_graphql_api_id: shopifyFulfillmentId,
    } = payload;
    const shopifyOrderId = composeGid('Order', rawOrderId);
    try {
        logInfo('Start: Handle fulfillment update for supplier/retailer', {
            webhookId,
        });
        const pool = await initializePool();
        client = await pool.connect();
        const [isRetailerFulfillment, isSupplierFulfillment, hasPaymentForFulfillment] = await Promise.all([
            isProcessableFulfillment(shopifyFulfillmentId, ROLES.RETAILER, client),
            isProcessableFulfillment(shopifyFulfillmentId, ROLES.SUPPLIER, client),
            hasPayment(shopifyFulfillmentId, client),
        ]);

        if (!isRetailerFulfillment && !isSupplierFulfillment) {
            logInfo('End: Order is not related to SynqSell.', {
                webhookId,
            });
            return;
        }

        // for handling fulfillment status updates
        if (fulfillmentStatus === 'cancelled') {
            if (isRetailerFulfillment) {
                await resyncRetailerFulfillment(shopifyFulfillmentId, shop, payload, client);
            } else if (isSupplierFulfillment) {
                await cancelRetailerFulfillment(shopifyFulfillmentId, client);
            }
        } else if (shipmentStatus === 'delivered' && isSupplierFulfillment && !hasPaymentForFulfillment) {
            // for supplier payment
            await handlePaymentForDeliveredOrder(shop, shopifyOrderId, shopifyFulfillmentId, payload, client);
        }

        logInfo('End: Handle fulfillment update for supplier/retailer.', {
            webhookId,
        });
        return;
    } catch (error) {
        logError(error, {
            context: `Failed to handle fulfillment update status.`,
            webhookId,
        });
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};
