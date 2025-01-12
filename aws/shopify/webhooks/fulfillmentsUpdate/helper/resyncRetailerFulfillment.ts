import { PoolClient } from 'pg';
import { Payload, ShopifyEvent } from '../types';
import { getSessionFromShop } from '/opt/nodejs/models/session';
import { getFulfillmentIdFromRetailerShopify } from '/opt/nodejs/models/fulfillment';
import { createFulfillmentShopify } from './util';

// ==============================================================================================================
// START: RESYNC FULFILLMENT FOR RETAILER STORE LOGIC
// ==============================================================================================================

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
    return res.rows[0].retailerShopifyFulfillmentOrderId as string;
}

const createFulfillmentInput = (payload: Payload, retailerShopifyFulfillmentOrderId: string) => {
    const lineItems = payload.line_items.map((lineItem) => ({
        id: lineItem.admin_graphql_api_id,
        quantity: lineItem.quantity,
    }));

    const trackingInfo = {
        company: payload.tracking_company,
        numbers: payload.tracking_numbers,
        urls: payload.tracking_urls,
    };

    const input = {
        trackingInfo,
        lineItemsByFulfillmentOrder: {
            fulfillmentOrderId: retailerShopifyFulfillmentOrderId,
            fulfillmentOrderLineItems: lineItems,
        },
    };

    return input;
};

async function updateRetailerShopifyFulfillmentIdDb(
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
    const [retailerSession, dbFulfillmentId] = await Promise.all([
        getSessionFromShop(shop, client),
        getFulfillmentIdFromRetailerShopify(retailerShopifyFulfillmentId, client),
    ]);

    const retailerShopifyFulfillmentOrderId = await getRetailerShopifyFulfillmentOrderId(dbFulfillmentId, client);
    const fulfillmentInput = createFulfillmentInput(payload, retailerShopifyFulfillmentOrderId);
    const newRetailerShopifyFulfillmentId = await createFulfillmentShopify(retailerSession, fulfillmentInput);
    await updateRetailerShopifyFulfillmentIdDb(dbFulfillmentId, newRetailerShopifyFulfillmentId, client);
}

export default resyncRetailerFulfillment;

export const exportsForTesting =
    process.env.NODE_ENV === 'test'
        ? {
              getRetailerShopifyFulfillmentOrderId,
              createFulfillmentInput,
              updateRetailerShopifyFulfillmentIdDb,
              resyncRetailerFulfillment,
          }
        : undefined;
