import { PoolClient } from "pg";
import { OrderLineItem } from "./types";

export async function getOrderLineItems(dbOrderId: string, client: PoolClient) {
  const query = `
      SELECT * FROM "OrderLineItem" 
      WHERE "orderId" = $1
  `;
  const res = await client.query(query, [dbOrderId]);
  if (res.rows.length === 0) {
    throw new Error(`No order line items exist for dbOrder ${dbOrderId}.`);
  }
  return res.rows as OrderLineItem[];
}
