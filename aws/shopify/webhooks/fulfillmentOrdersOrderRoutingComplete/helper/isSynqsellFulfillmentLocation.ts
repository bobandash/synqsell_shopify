import { PoolClient } from 'pg';
import { fetchAndValidateGraphQLData } from '/opt/nodejs/utils';
import { FulfillmentOrderLocationQuery } from '../types/admin.generated';
import type { Session } from '/opt/nodejs/models/types';
import { getFulfillmentService } from '/opt/nodejs/models/fulfillmentService';
import { GET_FULFILLMENT_ORDER_LOCATION } from '../graphql';

async function getShopifyLocationId(retailerSession: Session, fulfillmentOrderId: string) {
    const res = await fetchAndValidateGraphQLData<FulfillmentOrderLocationQuery>(
        retailerSession.shop,
        retailerSession.accessToken,
        GET_FULFILLMENT_ORDER_LOCATION,
        {
            id: fulfillmentOrderId,
        },
    );
    const shopifyLocationId = res.fulfillmentOrder?.assignedLocation.location?.id ?? '';
    return shopifyLocationId;
}

async function isSynqSellFulfillmentLocation(retailerSession: Session, fulfillmentOrderId: string, client: PoolClient) {
    const shopifyLocationId = await getShopifyLocationId(retailerSession, fulfillmentOrderId);
    if (!shopifyLocationId) {
        return false;
    }
    const fulfillmentService = await getFulfillmentService(retailerSession.id, shopifyLocationId, client);
    if (fulfillmentService && fulfillmentService.rows.length > 0) {
        return true;
    }
    return false;
}

export default isSynqSellFulfillmentLocation;
