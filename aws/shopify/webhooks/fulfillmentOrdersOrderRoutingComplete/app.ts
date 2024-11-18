import { PoolClient } from 'pg';
import { initializePool } from './db';
import { Session, ShopifyEvent } from './types';
import { createSupplierOrders, isSynqSellFulfillmentLocation, splitFulfillmentOrderBySupplier } from './helper';
import { SERVICE_CODE, ServiceCodeProps } from './constants';
import { fetchAndValidateGraphQLData } from './util';
import { FulfillmentOrderDeliveryMethodQuery } from './types/admin.generated';
import { GET_FULFILLMENT_ORDER_DELIVERY_SERVICE_CODE } from './graphql';

async function getSession(shop: string, client: PoolClient) {
    const query = `SELECT * FROM "Session" WHERE shop = $1 LIMIT 1`;
    const sessionData = await client.query(query, [shop]);
    if (sessionData.rows.length === 0) {
        throw new Error('Shop data is invalid.');
    }
    const session = sessionData.rows[0];
    return session as Session;
}

// The service code gives the delivery method the customer chose, please refer to deliveryCarrierService for full explanation
// but for a summary, when customer reaches checkout and checks out by selecting a shipping service, the same service code in checkout will be in the fulfillment order
async function getDeliveryMethodServiceCode(retailerSession: Session, shopifyFulfillmentOrderId: string) {
    const res = await fetchAndValidateGraphQLData<FulfillmentOrderDeliveryMethodQuery>(
        retailerSession.shop,
        retailerSession.accessToken,
        GET_FULFILLMENT_ORDER_DELIVERY_SERVICE_CODE,
        {
            id: shopifyFulfillmentOrderId,
        },
    );
    const serviceCode = res.fulfillmentOrder?.deliveryMethod?.serviceCode ?? SERVICE_CODE.STANDARD;
    return serviceCode as ServiceCodeProps;
}

export const lambdaHandler = async (event: ShopifyEvent) => {
    let client: null | PoolClient = null;
    try {
        const pool = await initializePool();
        client = await pool.connect();
        const shop = event.detail.metadata['X-Shopify-Shop-Domain'];
        const shopifyFulfillmentOrderId = event.detail.payload.fulfillment_order.id;
        const retailerSession = await getSession(shop, client);
        const isSynqSellOrder = await isSynqSellFulfillmentLocation(retailerSession, shopifyFulfillmentOrderId, client);
        if (!isSynqSellOrder) {
            console.log('This fulfillment order is not a SynqSell order.');
            return;
        }
        const serviceCode = await getDeliveryMethodServiceCode(retailerSession, shopifyFulfillmentOrderId);
        const fulfillmentOrdersBySupplier = await splitFulfillmentOrderBySupplier(
            shopifyFulfillmentOrderId,
            retailerSession.shop,
            retailerSession.accessToken,
            client,
        );
        await createSupplierOrders(
            fulfillmentOrdersBySupplier,
            shopifyFulfillmentOrderId,
            serviceCode,
            retailerSession,
            client,
        );
        console.log('Successfully created order for suppliers.');
        return;
    } catch (error) {
        console.error(error); // TODO: add better error handling, deal with prisma errors differently
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};
