import { PoolClient } from 'pg';
import { initializePool } from './db';
import { ShopifyEvent } from './types';
import { createSupplierOrders, isSynqSellFulfillmentLocation, splitFulfillmentOrderBySupplier } from './helper';
import { SERVICE_CODE, ServiceCodeProps } from './constants';
import { FulfillmentOrderDeliveryMethodQuery } from './types/admin.generated';
import { GET_FULFILLMENT_ORDER_DELIVERY_SERVICE_CODE } from './graphql';
import { getSessionFromShop } from '/opt/nodejs/models/session';
import { Session } from '/opt/nodejs/models/types';
import { fetchAndValidateGraphQLData } from '/opt/nodejs/utils';
import { logError, logInfo } from '/opt/nodejs/utils/logger';

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
    const shop = event.detail.metadata['X-Shopify-Shop-Domain'];
    const shopifyFulfillmentOrderId = event.detail.payload.fulfillment_order.id;
    try {
        logInfo('Start: Split fulfillment order', {
            shop,
            eventDetails: {
                shopifyFulfillmentOrderId,
            },
        });
        const pool = await initializePool();
        client = await pool.connect();
        const retailerSession = await getSessionFromShop(shop, client);
        const isSynqSellOrder = await isSynqSellFulfillmentLocation(retailerSession, shopifyFulfillmentOrderId, client);
        if (!isSynqSellOrder) {
            logInfo('This fulfillment order is not a SynqSell order', {
                shop,
                eventDetails: {
                    shopifyFulfillmentOrderId,
                },
            });
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
        logInfo('End: successfully split fulfillment orders by supplier', {
            shop,
            eventDetails: {
                shopifyFulfillmentOrderId,
            },
        });
        return;
    } catch (error) {
        logError(error, {
            context: 'Failed to split order into multiple fulfillment orders',
            shop,
            eventDetails: {
                shopifyFulfillmentOrderId,
            },
        });
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};
