import { PoolClient } from 'pg';
import { ROLES, RolesOptions } from '/opt/nodejs/constants';

async function isProcessableFulfillment(shopifyFulfillmentId: string, role: RolesOptions, client: PoolClient) {
    let query = '';
    if (role === ROLES.RETAILER) {
        query = `SELECT "id" FROM "Fulfillment" WHERE "retailerShopifyFulfillmentId" = $1`;
    } else if (role === ROLES.SUPPLIER) {
        query = `SELECT "id" FROM "Fulfillment" WHERE "supplierShopifyFulfillmentId" = $1`;
    }
    const res = await client.query(query, [shopifyFulfillmentId]);
    return res.rows.length > 0;
}

async function hasPayment(supplierShopifyFulfillmentId: string, client: PoolClient) {
    const query = `
      SELECT "Payment".id
      FROM "Fulfillment"
      INNER JOIN "Payment" ON "Fulfillment".id = "Payment"."fulfillmentId"
      WHERE "Fulfillment"."supplierShopifyFulfillmentId" = $1
      LIMIT 1
  `;
    const res = await client.query(query, [supplierShopifyFulfillmentId]);
    if (res.rows.length === 0) {
        return false;
    }
    return true;
}

export { isProcessableFulfillment, hasPayment };
