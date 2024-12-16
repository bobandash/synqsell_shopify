import { PoolClient } from 'pg';
import { initializePool } from './db';
import { ShopifyEvent } from './types';
import { cancelRetailerFulfillment, handlePaymentForDeliveredOrder, resyncRetailerFulfillment } from './helper';
import { composeGid } from '@shopify/admin-graphql-api-utilities';
import { ROLES, RolesOptions } from '/opt/nodejs/constants';
import { logError, logInfo } from '/opt/nodejs/utils/logger';

// This function listens to when the fulfillment ever updates
// fulfillment includes: fulfillment / tracking number being cancelled and shipment status changing
// https://shopify.dev/docs/api/admin-rest/2024-07/resources/fulfillment#put-orders-order-id-fulfillments-fulfillment-id
async function isProcessableFulfillment(shopifyFulfillmentId: string, role: RolesOptions, client: PoolClient) {
    let query = '';
    if (role === ROLES.RETAILER) {
        query = `SELECT "id" FROM "Fulfillment" WHERE "retailerShopifyFulfillmentId" = $1`;
    } else if (role === ROLES.SUPPLIER) {
        query = `SELECT "id" FROM "Fulfillment" WHERE "supplierShopifyFulfillmentId" = $1`;
    }
    const res = await client.query(query, [shopifyFulfillmentId]);
    return res.rows.length > 0;
}

export const lambdaHandler = async (event: ShopifyEvent) => {
    let client: null | PoolClient = null;
    const payload = event.detail.payload;
    const shop = event.detail.metadata['X-Shopify-Shop-Domain'];
    const {
        status: fulfillmentStatus,
        shipment_status: shipmentStatus,
        order_id: rawOrderId,
        admin_graphql_api_id: shopifyFulfillmentId,
    } = payload;
    const shopifyOrderId = composeGid('Order', rawOrderId);
    const eventDetails = {
        shipmentStatus,
        fulfillmentStatus,
        shopifyFulfillmentId,
        shopifyOrderId,
    };

    try {
        logInfo('Start: Handle fulfillment update for supplier/retailer', {
            shop,
            eventDetails,
        });
        const pool = await initializePool();
        client = await pool.connect();
        const [isRetailerFulfillment, isSupplierFulfillment] = await Promise.all([
            isProcessableFulfillment(shopifyFulfillmentId, ROLES.RETAILER, client),
            isProcessableFulfillment(shopifyFulfillmentId, ROLES.SUPPLIER, client),
        ]);

        if (!isRetailerFulfillment && !isSupplierFulfillment) {
            logInfo('End: Order is not related to SynqSell.', {
                shop,
                eventDetails,
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
        } else if (shipmentStatus === 'delivered' && isSupplierFulfillment) {
            await handlePaymentForDeliveredOrder(shop, shopifyOrderId, shopifyFulfillmentId, payload, client);
        }

        logInfo('End: Handle fulfillment update for supplier/retailer.', {
            shop,
            eventDetails,
        });
        return;
    } catch (error) {
        logError(error, {
            context: `Failed to handle fulfillment update status.`,
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
