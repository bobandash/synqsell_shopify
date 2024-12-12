import { PoolClient } from "pg";

export async function getFulfillmentService(
  sessionId: string,
  shopifyLocationId: string,
  client: PoolClient
) {
  const query = `
    SELECT * FROM "FulfillmentService" 
    WHERE "shopifyLocationId" = $1 
    AND "sessionId" = $2 
    LIMIT 1
  `;
  const fulfillmentService = await client.query(query, [
    shopifyLocationId,
    sessionId,
  ]);
  return fulfillmentService;
}
