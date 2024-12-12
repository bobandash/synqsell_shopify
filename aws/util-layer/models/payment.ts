import { PoolClient } from "pg";

export async function hasPaymentFromFulfillmentId(
  dbFulfillmentId: string,
  client: PoolClient
) {
  const query = `
      SELECT * FROM "Payment"
      WHERE "fulfillmentId" = $1
      LIMIT 1
  `;
  const res = await client.query(query, [dbFulfillmentId]);
  return res.rows.length > 0;
}
