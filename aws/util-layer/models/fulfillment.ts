import { PoolClient } from "pg";
import { Fulfillment } from "./types";

export async function getFulfillment(
  dbFulfillmentId: string,
  client: PoolClient
) {
  const query = `
      SELECT * FROM "Fulfillment"
      WHERE "id" = $1
      LIMIT 1
    `;
  const res = await client.query(query, [dbFulfillmentId]);
  if (res.rows.length === 0) {
    throw new Error(
      `No fulfillment exists for dbFulfillmentId ${dbFulfillmentId}.`
    );
  }
  return res.rows[0] as Fulfillment;
}

export async function deleteFulfillment(id: string, client: PoolClient) {
  const query = `DELETE FROM "Fulfillment" WHERE "id" = $1`;
  await client.query(query, [id]);
}

export async function getFulfillmentIdFromSupplierShopify(
  supplierShopifyFulfillmentId: string,
  client: PoolClient
) {
  const query = `
      SELECT "id" FROM "Fulfillment"
      WHERE "supplierShopifyFulfillmentId" = $1
      LIMIT 1
    `;
  const res = await client.query(query, [supplierShopifyFulfillmentId]);
  if (res.rows.length === 0) {
    throw new Error(
      `No fulfillment row exists for supplierShopifyFulfillmentId ${supplierShopifyFulfillmentId}.`
    );
  }
  return res.rows[0].id as string;
}

export async function getFulfillmentIdFromRetailerShopify(
  retailerShopifyFulfillmentId: string,
  client: PoolClient
) {
  const query = `
    SELECT "id" FROM "Fulfillment"
    WHERE "retailerShopifyFulfillmentId" = $1
    LIMIT 1
  `;
  const res = await client.query(query, [retailerShopifyFulfillmentId]);
  if (res.rows.length === 0) {
    throw new Error(
      `No fulfillment row exists for retailerShopifyFulfillmentId ${retailerShopifyFulfillmentId}.`
    );
  }
  return res.rows[0].id as string;
}
