import { PoolClient } from "pg";
import { Order, Session } from "./types";

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

export async function getRetailerSessionFromSupplierOrder(
  supplierShopifyOrderId: string,
  client: PoolClient
) {
  const query = `
      SELECT "Session".* FROM "Order"
      INNER JOIN "Session" ON "Session"."id" = "Order"."retailerId" 
      WHERE "supplierShopifyOrderId" = $1
      LIMIT 1        
  `;
  const res = await client.query(query, [supplierShopifyOrderId]);
  if (res.rows.length === 0) {
    throw new Error("No retailer session exists for " + supplierShopifyOrderId);
  }
  return res.rows[0] as Session;
}

async function getOrderId(supplierShopifyOrderId: string, client: PoolClient) {
  const query = `
      SELECT "id" FROM "Order"
      WHERE "supplierShopifyOrderId" = $1
      LIMIT 1        
  `;
  const res = await client.query(query, [supplierShopifyOrderId]);
  if (res.rows.length === 0) {
    throw new Error(
      "There is no order id for shopify supplier order id " +
        supplierShopifyOrderId
    );
  }
  return res.rows[0].id as string;
}

async function getRetailerShopifyFulfillmentOrderId(
  supplierShopifyOrderId: string,
  client: PoolClient
) {
  const query = `
      SELECT "retailerShopifyFulfillmentOrderId"
      FROM "Order"
      WHERE "supplierShopifyOrderId" = $1
      LIMIT 1
  `;
  const queryRes = await client.query(query, [supplierShopifyOrderId]);
  if (queryRes.rows.length === 0) {
    throw new Error(
      "There is no retailer fulfillment order id for " + supplierShopifyOrderId
    );
  }
  return queryRes.rows[0].retailerShopifyFulfillmentOrderId as string;
}
