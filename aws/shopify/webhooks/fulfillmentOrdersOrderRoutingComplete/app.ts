import { APIGatewayProxyResult } from 'aws-lambda';
import { PoolClient } from 'pg';
import { initializePool } from './db';
import { Session, ShopifyEvent } from './types';
import { createSupplierOrders, isSynqsellFulfillmentLocation, splitFulfillmentOrderBySupplier } from './helper';
import { RESPONSE, SERVICE_CODE, ServiceCodeProps } from './constants';
import { fetchAndValidateGraphQLData } from './util';
import { FulfillmentOrderDeliveryMethodQuery } from './types/admin.generated';
import { GET_FULFILLMENT_ORDER_DELIVERY_SERVICE_CODE } from './graphql';

async function getSession(shop: string, client: PoolClient) {
    try {
        const query = `SELECT * FROM "Session" WHERE shop = $1 LIMIT 1`;
        const sessionData = await client.query(query, [shop]);
        if (sessionData.rows.length === 0) {
            throw new Error('Shop data is invalid.');
        }
        const session = sessionData.rows[0];
        return session as Session;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to retrieve session from shop ${shop}.`);
    }
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
