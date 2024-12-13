import { PoolClient } from "pg";
import { FulfillmentService } from "./types";

export async function getFulfillmentService(
  sessionId: string,
  client: PoolClient
) {
  const query = `
    SELECT * FROM "FulfillmentService" 
    WHERE "sessionId" = $1
    LIMIT 1
  `;
  const res = await client.query(query, [sessionId]);
  if (res.rows.length === 0) {
    throw new Error(
      `No fulfillment service exists for sessionId ${sessionId}.`
    );
  }
  return res.rows[0] as FulfillmentService;
}

export async function hasFulfillmentService(
  sessionId: string,
  client: PoolClient
) {
  const query = `
    SELECT * FROM "FulfillmentService" 
    WHERE "sessionId" = $1
    LIMIT 1
  `;
  const res = await client.query(query, [sessionId]);
  return res.rows.length > 0;
}
