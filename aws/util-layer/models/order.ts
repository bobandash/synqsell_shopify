import { PoolClient } from "pg";
import { Order } from "./types";

export async function isOrder(
  shopifyOrderId: string,
  supplierId: string,
  client: PoolClient
) {
  const query = `
      SELECT "id" FROM "Order"
      WHERE "supplierId" = $1 AND "supplierShopifyOrderId" = $2
  `;
  const orderData = await client.query(query, [supplierId, shopifyOrderId]);
  return orderData.rows.length > 0;
}

export async function getOrderFromSupplierShopifyOrderId(
  supplierShopifyOrderId: string,
  client: PoolClient
) {
  const query = `
      SELECT * FROM "Order"
      WHERE "supplierShopifyOrderId" = $1
      LIMIT 1        
  `;
  const res = await client.query(query, [supplierShopifyOrderId]);
  if (res.rows.length === 0) {
    throw new Error(
      `There is no order for shopify supplier order id ${supplierShopifyOrderId}.`
    );
  }
  return res.rows[0] as Order;
}
