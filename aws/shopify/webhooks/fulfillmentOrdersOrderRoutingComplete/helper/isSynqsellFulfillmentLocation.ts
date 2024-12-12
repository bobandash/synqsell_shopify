import { PoolClient } from 'pg';
import { fetchAndValidateGraphQLData } from '/opt/nodejs/utils';
import { FulfillmentOrderLocationQuery } from '../types/admin.generated';
import type { Session } from '/opt/nodejs/models/types';
import { hasFulfillmentService } from '/opt/nodejs/models/fulfillmentService';
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
    const fulfillmentServiceExists = await hasFulfillmentService(retailerSession.id, client);
    return fulfillmentServiceExists;
}

export default isSynqSellFulfillmentLocation;
