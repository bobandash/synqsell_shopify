// case: supplier mistakenly bought incorrect tracking label, have to refund and update for the customer
import { PoolClient } from 'pg';
import { FulfillmentCancelMutation, FulfillmentOrderOpenMutation } from '../types/admin.generated';
import { CANCEL_FULFILLMENT_MUTATION, OPEN_FULFILLMENT_ORDER_MUTATION } from '../graphql';
import { deleteFulfillment, getFulfillment, getFulfillmentIdFromSupplierShopify } from '/opt/nodejs/models/fulfillment';
import { Session } from '/opt/nodejs/models/types';
import { mutateAndValidateGraphQLData } from '/opt/nodejs/utils';
import { getRetailerSessionFromOrderId } from '/opt/nodejs/models/session';

// ==============================================================================================================
// START: CANCEL FULFILLMENT ON RETAILER STORE LOGIC
// ==============================================================================================================

async function removeRetailerFulfillmentShopify(retailerSession: Session, retailerShopifyFulfillmentId: string) {
    await mutateAndValidateGraphQLData<FulfillmentCancelMutation>(
        retailerSession.shop,
        retailerSession.accessToken,
        CANCEL_FULFILLMENT_MUTATION,
        {
            id: retailerShopifyFulfillmentId,
        },
        `Could not cancel fulfillment for ${retailerShopifyFulfillmentId}`,
    );
    await mutateAndValidateGraphQLData<FulfillmentOrderOpenMutation>(
        retailerSession.shop,
        retailerSession.accessToken,
        OPEN_FULFILLMENT_ORDER_MUTATION,
        {
            id: retailerShopifyFulfillmentId,
        },
        `Could not open fulfillment for ${retailerShopifyFulfillmentId}`,
    );
}

// ==============================================================================================================
// START: END CANCEL FULFILLMENT ON RETAILER STORE LOGIC
// ==============================================================================================================

async function cancelRetailerFulfillment(supplierShopifyFulfillmentId: string, client: PoolClient) {
    const dbFulfillmentId = await getFulfillmentIdFromSupplierShopify(supplierShopifyFulfillmentId, client);
    const { retailerShopifyFulfillmentId, orderId: dbOrderId } = await getFulfillment(dbFulfillmentId, client);
    const retailerSession = await getRetailerSessionFromOrderId(dbOrderId, client);
    await removeRetailerFulfillmentShopify(retailerSession, retailerShopifyFulfillmentId);
    await deleteFulfillment(dbFulfillmentId, client);
}

export default cancelRetailerFulfillment;
