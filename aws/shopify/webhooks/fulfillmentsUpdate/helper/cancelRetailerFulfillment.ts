import { PoolClient } from 'pg';
import {
    deleteFulfillment as deleteFulfillmentDb,
    getFulfillment,
    getFulfillmentIdFromSupplierShopify,
} from '/opt/nodejs/models/fulfillment';
import { getRetailerSessionFromOrderId } from '/opt/nodejs/models/session';
import { cancelFulfillmentShopify, openFulfillmentShopify } from './util';

// case: supplier mistakenly bought incorrect tracking label
// we have to cancel the created fulfillment on the retailer's store
async function cancelRetailerFulfillment(supplierShopifyFulfillmentId: string, client: PoolClient) {
    const dbFulfillmentId = await getFulfillmentIdFromSupplierShopify(supplierShopifyFulfillmentId, client);
    const { retailerShopifyFulfillmentId, orderId: dbOrderId } = await getFulfillment(dbFulfillmentId, client);
    const retailerSession = await getRetailerSessionFromOrderId(dbOrderId, client);
    await cancelFulfillmentShopify(retailerSession, retailerShopifyFulfillmentId);
    await openFulfillmentShopify(retailerSession, retailerShopifyFulfillmentId);
    await deleteFulfillmentDb(dbFulfillmentId, client);
}

export default cancelRetailerFulfillment;
