import { PoolClient } from 'pg';
import { PayloadLineItem, PayloadTrackingInfo, ShopifyEvent } from '../types';
import { FulfillmentCreateV2Mutation } from '../types/admin.generated';
import { CREATE_FULFILLMENT_FULFILLMENT_ORDER_MUTATION } from '../graphql';
import { getSessionFromShop } from '/opt/nodejs/models/session';
import { Session } from '/opt/nodejs/models/types';
import { mutateAndValidateGraphQLData } from '/opt/nodejs/utils';
import { getFulfillmentIdFromRetailerShopify } from '/opt/nodejs/models/fulfillment';

// ==============================================================================================================
// START: RESYNC FULFILLMENT FOR RETAILER STORE LOGIC
// ==============================================================================================================
function getRelevantDetailsForResyncingRetailerFulfillment(payload: ShopifyEvent['detail']['payload']) {
    const lineItems = payload.line_items.map((lineItem) => ({
        id: lineItem.admin_graphql_api_id,
        quantity: lineItem.quantity,
    }));
    const trackingInfo = {
        company: payload.tracking_company,
        numbers: payload.tracking_numbers,
        urls: payload.tracking_urls,
    };

    return { lineItems, trackingInfo };
}

async function getRetailerShopifyFulfillmentOrderId(dbFulfillmentId: string, client: PoolClient) {
    const query = `
        SELECT "retailerShopifyFulfillmentOrderId" 
        FROM "Order" 
        WHERE "id" = (SELECT "orderId" FROM "Fulfillment" WHERE "id" = $1)
    `;
    const res = await client.query(query, [dbFulfillmentId]);
    if (res.rows.length === 0) {
        throw new Error(`No retailerShopifyFulfillmentOrderId exists for dbFulfillmentId ${dbFulfillmentId}.`);
    }
    return res.rows[0].id as string;
}

async function updateRetailerFulfillmentOnShopify(
    retailerShopifyFulfillmentOrderId: string,
    lineItems: PayloadLineItem[],
    trackingInfo: PayloadTrackingInfo,
    retailerSession: Session,
) {
    const fulfillmentInput = {
        trackingInfo,
        lineItemsByFulfillmentOrder: {
            fulfillmentOrderId: retailerShopifyFulfillmentOrderId,
            fulfillmentOrderLineItems: lineItems,
        },
    };

    const res = await mutateAndValidateGraphQLData<FulfillmentCreateV2Mutation>(
        retailerSession.shop,
        retailerSession.accessToken,
        CREATE_FULFILLMENT_FULFILLMENT_ORDER_MUTATION,
        { fulfillment: fulfillmentInput },
        "Failed to re-create fulfillment for retailer from supplier's data",
    );

    const newRetailerShopifyFulfillmentId = res.fulfillmentCreateV2?.fulfillment?.id;
    if (!newRetailerShopifyFulfillmentId) {
        throw new Error('No shopify fulfillment id was created from mutation.');
    }
    return newRetailerShopifyFulfillmentId;
}

async function updateFulfillmentInDatabase(
    dbFulfillmentId: string,
    newRetailerShopifyFulfillmentId: string,
    client: PoolClient,
) {
    const query = `
        UPDATE "Fulfillment"
        SET "retailerShopifyFulfillmentId" = $1
        WHERE "id" = $2
    `;
    await client.query(query, [newRetailerShopifyFulfillmentId, dbFulfillmentId]);
}

// ==============================================================================================================
// START: RESYNC FULFILLMENT FOR RETAILER STORE LOGIC
// ==============================================================================================================

// if the retailer cancels the fulfillment of the order, then by default, it reads the supplier fulfillment and re-fulfills the order
// the supplier should be the single source of truth for fulfillments because the retailer doesn't handle this
// because it doesn't make sense that if supplier ships the order, customer has a problem, retailer refunds customer and supplier is not paid
// and supplier doesn't know of this, then that's a big issue, so do not handle refunds for now; just cancellation and fulfillment
async function resyncRetailerFulfillment(
    retailerShopifyFulfillmentId: string,
    shop: string,
    payload: ShopifyEvent['detail']['payload'],
    client: PoolClient,
) {
    const { lineItems, trackingInfo } = getRelevantDetailsForResyncingRetailerFulfillment(payload);
    const [retailerSession, dbFulfillmentId] = await Promise.all([
        getSessionFromShop(shop, client),
        getFulfillmentIdFromRetailerShopify(retailerShopifyFulfillmentId, client),
    ]);
    const retailerShopifyFulfillmentOrderId = await getRetailerShopifyFulfillmentOrderId(dbFulfillmentId, client);
    const newRetailerShopifyFulfillmentId = await updateRetailerFulfillmentOnShopify(
        retailerShopifyFulfillmentOrderId,
        lineItems,
        trackingInfo,
        retailerSession,
    );
    await updateFulfillmentInDatabase(dbFulfillmentId, newRetailerShopifyFulfillmentId, client);
}

export default resyncRetailerFulfillment;
