import { PoolClient } from "pg";

export async function hasStripeCustomerAccount(
  retailerId: string,
  client: PoolClient
) {
  const query = `
      SELECT id FROM "StripeCustomerAccount"
      WHERE "retailerId" = $1
  `;
  const res = await client.query(query, [retailerId]);
  return res.rows.length > 0;
}

export async function getStripeCustomerId(
  retailerId: string,
  client: PoolClient
) {
  const query = `
      SELECT "stripeCustomerId" FROM "StripeCustomerAccount"
      WHERE "retailerId" = $1
      LIMIT 1
  `;
  const res = await client.query(query, [retailerId]);
  if (res.rows.length === 0) {
    throw new Error(
      `No stripe customer id id exists for retailerId ${retailerId}.`
    );
  }
  return res.rows[0].stripeCustomerId as string;
}

export async function updatePaymentMethodStatus(
  customerId: string,
  hasPaymentMethod: boolean,
  client: PoolClient
) {
  const query = `
      UPDATE "StripeCustomerAccount"
      SET "hasPaymentMethod" = $1
      WHERE "stripeCustomerId" = $2
  `;
  await client.query(query, [hasPaymentMethod, customerId]);
}
