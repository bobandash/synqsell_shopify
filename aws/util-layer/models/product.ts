import { PoolClient } from "pg";

export async function isProduct(shopifyProductId: string, client: PoolClient) {
  const productQuery = `SELECT FROM "Product" WHERE "shopifyProductId" = $1 LIMIT 1`;
  const res = await client.query(productQuery, [shopifyProductId]);
  if (res.rows.length > 0) {
    return true;
  }
  return false;
}

export async function deleteProduct(
  shopifyProductId: string,
  client: PoolClient
) {
  const deleteSupplierProductMutation = `DELETE FROM "Product" WHERE "shopifyProductId" = $1`;
  await client.query(deleteSupplierProductMutation, [shopifyProductId]);
}
