import { PoolClient } from "pg";

export async function deleteBilling(sessionId: string, client: PoolClient) {
  const query = `
      DELETE FROM "Billing"
      WHERE "sessionId" = $1
  `;
  await client.query(query, [sessionId]);
}
