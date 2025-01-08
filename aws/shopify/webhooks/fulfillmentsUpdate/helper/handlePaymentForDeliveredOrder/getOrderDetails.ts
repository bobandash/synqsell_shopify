import { PoolClient } from 'pg';
import { OrderDetailsData, Payload, SupplierOrderLineItem } from '../../types';
import { getOrderLineItems } from '/opt/nodejs/models/orderLineItem';
import { createMapIdToRestObj } from '/opt/nodejs/utils';
import { getSessionFromShop } from '/opt/nodejs/models/session';
import { getOrderFromSupplierShopifyOrderId, hasOrder } from '/opt/nodejs/models/order';
import { getFulfillmentIdFromSupplierShopify } from '/opt/nodejs/models/fulfillment';
import { getCurrencyShopifyFmt, getCurrencyStripeFmt } from '/opt/nodejs/utils';

// ==============================================================================================================
// GET INITIAL DATA NEEDED FOR HANDLING PAYMENTS FOR STRIPE + SHOPIFY
// ==============================================================================================================

async function getRetailerSessionFromFulfillmentId(dbFulfillmentId: string, client: PoolClient) {
    const query = `
      SELECT "Session".*
      FROM "Fulfillment"
      INNER JOIN "Order" ON "Fulfillment"."orderId" = "Order"."id"
      INNER JOIN "Session" ON "Order"."retailerId" = "Session"."id"
      WHERE "Fulfillment"."id" = $1
    `;
    const res = await client.query(query, [dbFulfillmentId]);
    if (res.rows.length === 0) {
        throw new Error(`No retailer session exists for fulfillment id ${dbFulfillmentId}.`);
    }
    return res.rows[0];
}

async function getOrderTotalQuantity(dbOrderId: string, client: PoolClient) {
    const isValidOrder = await hasOrder(dbOrderId, client);
    if (!isValidOrder) {
        throw new Error(`${dbOrderId} dbOrderId is not a valid order.`);
    }

    const query = `
        SELECT SUM(quantity) as "totalQty"
        FROM "OrderLineItem"
        WHERE "orderId" = $1
    `;
    const res = await client.query(query, [dbOrderId]);
    const totalQty = Number(res.rows[0].totalQty);
    if (totalQty === 0) {
        throw new Error(`Order id ${dbOrderId} has no quantity`);
    }
    return Number(res.rows[0].totalQty);
}

async function getShippingTotalPaidToDate(dbOrderId: string, client: PoolClient) {
    const isValidOrder = await hasOrder(dbOrderId, client);
    if (!isValidOrder) {
        throw new Error(`${dbOrderId} dbOrderId is not a valid order.`);
    }
    const query = `
        SELECT SUM("shippingPaid") as "totalShippingPaid"
        FROM "Payment"
        WHERE "orderId" = $1
    `;
    const res = await client.query(query, [dbOrderId]);
    return Number(res.rows[0].totalShippingPaid);
}

async function getShippingPayable(
    dbOrderId: string,
    orderTotalShippingCost: number,
    totalFulfillmentQty: number,
    client: PoolClient,
) {
    const orderTotalQty = await getOrderTotalQuantity(dbOrderId, client);
    const shippingPayableAmountEstimate = Number(
        (orderTotalShippingCost * (totalFulfillmentQty / orderTotalQty)).toFixed(2),
    );
    const shippingTotalPaidToDate = await getShippingTotalPaidToDate(dbOrderId, client);
    const difference = orderTotalShippingCost - shippingPayableAmountEstimate - shippingTotalPaidToDate;
    // handle case there's rounding errors for shipping price
    // e.g. 5 / 3 = 1.33 --> 1.33 * 3 = 4.99; missing 0.01
    let shippingPayableAmount = shippingPayableAmountEstimate;
    if (shippingPayableAmount && Math.abs(difference) <= 0.5) {
        shippingPayableAmount += difference;
    }
    return Math.max(shippingPayableAmount, 0);
}

async function getOrderPayable(dbOrderId: string, supplierOrderLineItems: SupplierOrderLineItem[], client: PoolClient) {
    const orderLineItems = await getOrderLineItems(dbOrderId, client);
    const orderLineItemsLookup = createMapIdToRestObj(orderLineItems, 'supplierShopifyOrderLineItemId');
    const orderPayableAmount = supplierOrderLineItems.reduce((acc, lineItem) => {
        const { supplierShopifyOrderLineItemId, quantityFulfilled } = lineItem;
        const entireOrderLineItem = orderLineItemsLookup.get(supplierShopifyOrderLineItemId);
        if (!entireOrderLineItem) {
            throw new Error(
                `No order line item exists in the database for supplierShopifyOrderLineItemId ${supplierShopifyOrderLineItemId}`,
            );
        }
        const { supplierProfitPerUnit } = entireOrderLineItem;
        const orderPayable = supplierProfitPerUnit * quantityFulfilled;
        return acc + orderPayable;
    }, 0);
    return orderPayableAmount;
}

async function getOrderDetails(
    supplierShop: string,
    supplierShopifyOrderId: string,
    supplierShopifyFulfillmentId: string,
    supplierPayload: Payload,
    client: PoolClient,
): Promise<OrderDetailsData> {
    const orderLineItems: SupplierOrderLineItem[] = supplierPayload.line_items.map((lineItem) => ({
        supplierShopifyOrderLineItemId: lineItem.admin_graphql_api_id,
        quantityFulfilled: lineItem.quantity,
    }));
    const totalFulfillmentQty = orderLineItems.reduce((acc, { quantityFulfilled }) => acc + quantityFulfilled, 0);
    const [dbFulfillmentId, supplierSession, orderDetails] = await Promise.all([
        getFulfillmentIdFromSupplierShopify(supplierShopifyFulfillmentId, client),
        getSessionFromShop(supplierShop, client),
        getOrderFromSupplierShopifyOrderId(supplierShopifyOrderId, client),
    ]);
    const [retailerSession, shippingPayable, orderPayable] = await Promise.all([
        getRetailerSessionFromFulfillmentId(dbFulfillmentId, client),
        getShippingPayable(orderDetails.id, orderDetails.shippingCost, totalFulfillmentQty, client),
        getOrderPayable(orderDetails.id, orderLineItems, client),
    ]);

    const currency = orderDetails.currency;
    return {
        orderLineItems,
        dbFulfillmentId,
        supplierSession,
        retailerSession,
        orderDetails,
        payments: {
            shippingPayable,
            orderPayable,
            totalPayable: shippingPayable + orderPayable,
        },
        currency: {
            original: currency,
            stripeCurrency: getCurrencyStripeFmt(currency),
            shopifyCurrency: getCurrencyShopifyFmt(currency),
        },
    };
}

export default getOrderDetails;

export const exportsForTesting =
    process.env.NODE_ENV === 'test'
        ? {
              getRetailerSessionFromFulfillmentId,
              getShippingPayable,
              getOrderTotalQuantity,
              getShippingTotalPaidToDate,
              getOrderPayable,
              getOrderDetails,
          }
        : undefined;
