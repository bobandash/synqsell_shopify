import { PoolClient } from "pg";

export async function isImportedProduct(
  shopifyProductId: string,
  client: PoolClient
) {
  const productQuery = `SELECT FROM "ImportedProduct" WHERE "shopifyProductId" = $1 LIMIT 1`;
  const res = await client.query(productQuery, [shopifyProductId]);
  if (res.rows.length > 0) {
    return true;
  }
  return false;
}

export async function deleteImportedProduct(
  shopifyProductId: string,
  client: PoolClient
) {
  const query = `DELETE FROM "ImportedProduct" WHERE "shopifyProductId" = $1`;
  await client.query(query, [shopifyProductId]);
}

export async function deleteAllImportedProducts(
  retailerId: string,
  client: PoolClient
) {
  const query = `
      DELETE FROM "ImportedProduct"
      WHERE "retailerId" = $1
    `;
  await client.query(query, [retailerId]);
}
