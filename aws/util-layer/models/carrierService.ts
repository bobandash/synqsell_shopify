import { PoolClient } from "pg";

export async function getShopifyCarrierServiceId(
  sessionId: string,
  client: PoolClient
) {
  const query = `
      SELECT "shopifyCarrierServiceId" FROM "CarrierService"
      WHERE "retailerId" = $1
  `;
  const res = await client.query(query, [sessionId]);
  if (res.rows.length === 0) {
    throw new Error(`No shopify carrier service exists.`);
  }
  return res.rows[0].shopifyCarrierServiceId as string;
}
