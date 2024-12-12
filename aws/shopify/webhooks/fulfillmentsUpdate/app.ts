import { PoolClient } from 'pg';
import { initializePool } from './db';
import { ShopifyEvent } from './types';
import { cancelRetailerFulfillment, handlePaymentForDeliveredOrder, resyncRetailerFulfillment } from './helper';
import { composeGid } from '@shopify/admin-graphql-api-utilities';
import { ROLES, RolesOptions } from '/opt/nodejs/constants';

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
    try {
        const pool = await initializePool();
        client = await pool.connect();
        const payload = event.detail.payload;
        const shop = event.detail.metadata['X-Shopify-Shop-Domain'];
        const {
            status: fulfillmentStatus,
            shipment_status: shipmentStatus,
            order_id: rawOrderId,
            admin_graphql_api_id: shopifyFulfillmentId,
        } = payload;
        const shopifyOrderId = composeGid('Order', rawOrderId);

        const [isRetailerFulfillment, isSupplierFulfillment] = await Promise.all([
            isProcessableFulfillment(shopifyFulfillmentId, ROLES.RETAILER, client),
            isProcessableFulfillment(shopifyFulfillmentId, ROLES.SUPPLIER, client),
        ]);

        if (!isRetailerFulfillment && !isSupplierFulfillment) {
            console.log(`${shopifyOrderId} is not related to SynqSell.`);
            return;
        }

        // for handling fulfillment status updates
        if (fulfillmentStatus === 'cancelled') {
            if (isRetailerFulfillment) {
                await resyncRetailerFulfillment(shopifyFulfillmentId, shop, payload, client);
                console.log("Successfully resynced retailer's fulfillment to match supplier's fulfillment.");
            } else if (isSupplierFulfillment) {
                await cancelRetailerFulfillment(shopifyFulfillmentId, client);
                console.log("Successfully synced retailer's fulfillment with supplier's fulfillment.");
            }
        } else if (shipmentStatus === 'delivered' && isSupplierFulfillment) {
            await handlePaymentForDeliveredOrder(shop, shopifyOrderId, shopifyFulfillmentId, payload, client);
        }

        return;
    } catch (error) {
        console.error(`Failed to handle fulfillment update status.`, error);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};
