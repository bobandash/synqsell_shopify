import { PoolClient } from 'pg';
import { fetchAndValidateGraphQLData } from '../util';
import { FulfillmentOrderLocationQuery } from '../types/admin.generated';
import { Session } from '../types';
import { GET_FULFILLMENT_ORDER_LOCATION } from '../graphql';

async function isSynqSellFulfillmentLocation(retailerSession: Session, fulfillmentOrderId: string, client: PoolClient) {
    const locationQuery = await fetchAndValidateGraphQLData<FulfillmentOrderLocationQuery>(
        retailerSession.shop,
        retailerSession.accessToken,
        GET_FULFILLMENT_ORDER_LOCATION,
        {
            id: fulfillmentOrderId,
        },
    );
    const fulfillmentOrderShopifyLocationId = locationQuery.fulfillmentOrder?.assignedLocation.location?.id ?? '';
    if (!fulfillmentOrderShopifyLocationId) {
        return false;
    }
    const fulfillmentServiceQuery = `
      SELECT id FROM "FulfillmentService" 
      WHERE "shopifyLocationId" = $1 
      AND "sessionId" = $2 
      LIMIT 1
  `;
    const fulfillmentService = await client.query(fulfillmentServiceQuery, [
        fulfillmentOrderShopifyLocationId,
        retailerSession.id,
    ]);
    if (fulfillmentService && fulfillmentService.rows.length > 0) {
        return true;
    }
    return false;
}

export default isSynqSellFulfillmentLocation;
