import { PoolClient } from "pg";
import { Product } from "./types";

export async function isProduct(shopifyProductId: string, client: PoolClient) {
  const query = `SELECT FROM "Product" WHERE "shopifyProductId" = $1 LIMIT 1`;
  const res = await client.query(query, [shopifyProductId]);
  if (res.rows.length > 0) {
    return true;
  }
  return false;
}

export async function deleteProduct(
  shopifyProductId: string,
  client: PoolClient
) {
  const query = `DELETE FROM "Product" WHERE "shopifyProductId" = $1`;
  await client.query(query, [shopifyProductId]);
}

export async function getProductFromRetailerShopifyProductId(
  retailerShopifyProductId: string,
  client: PoolClient
) {
  const query = `
      SELECT 
          "Product".* 
      FROM "ImportedProduct"
      INNER JOIN "Product" ON "Product"."id" = "ImportedProduct"."prismaProductId"
      WHERE "ImportedProduct"."shopifyProductId" = $1
      LIMIT 1
  `;
  const res = await client.query(query, [retailerShopifyProductId]);
  if (res.rows.length === 0) {
    throw new Error(`No product matches retailer shopify product id.`);
  }
  return res.rows[0] as Product;
}
