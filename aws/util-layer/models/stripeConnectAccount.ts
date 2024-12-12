import { PoolClient } from "pg";

export async function getStripeAccountId(
  supplierId: string,
  client: PoolClient
) {
  const query = `
      SELECT "stripeAccountId" FROM "StripeConnectAccount"
      WHERE "supplierId" = $1
      LIMIT 1
  `;
  const res = await client.query(query, [supplierId]);
  if (res.rows.length === 0) {
    throw new Error(
      `No stripe account id exists for supplierId ${supplierId}.`
    );
  }
  return res.rows[0].stripeAccountId as string;
}

export async function hasStripeConnectAccount(
  supplierId: string,
  client: PoolClient
) {
  const query = `
      SELECT id FROM "StripeConnectAccount"
      WHERE "supplierId" = $1
  `;
  const res = await client.query(query, [supplierId]);
  return res.rows.length > 0;
}
