import { PoolClient } from "pg";

export async function hasProcessed(webhookId: string, client: PoolClient) {
  const query = `
      SELECT * FROM "StripeWebhook"
      WHERE id = $1
  `;
  const res = await client.query(query, [webhookId]);
  return res.rows.length > 0;
}

export async function processWebhook(webhookId: string, client: PoolClient) {
  const query = `
        INSERT INTO "StripeWebhook" (id) 
        VALUES ($1)
    `;
  const res = await client.query(query, [webhookId]);
  return res.rows.length > 0;
}
