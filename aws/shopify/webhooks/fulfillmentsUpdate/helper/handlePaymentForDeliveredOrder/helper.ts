import { PoolClient } from 'pg';
import { OrderDetailsData, Payload, SupplierOrderLineItem } from '../../types';
import { getStripe, getStripePaymentMethod } from '../../stripe';
import { v4 as uuidv4 } from 'uuid';
import { USAGE_CHARGE_MUTATION } from '../../graphql';
import { AppUsageRecordCreateMutation } from '../../types/admin.generated';
import { getOrderLineItems } from '/opt/nodejs/models/orderLineItem';
import { getStripeAccountId } from '/opt/nodejs/models/stripeConnectAccount';
import { getStripeCustomerId } from '/opt/nodejs/models/stripeCustomerAccount';
import { createMapIdToRestObj, mutateAndValidateGraphQLData } from '/opt/nodejs/utils';
import type { Session } from '/opt/nodejs/models/types';
import { ORDER_PAYMENT_STATUS } from '/opt/nodejs/constants';
import { logError } from '/opt/nodejs/utils/logger';
import { getSessionFromShop } from '/opt/nodejs/models/session';
import { getOrderFromSupplierShopifyOrderId, hasOrder } from '/opt/nodejs/models/order';
import { getFulfillmentIdFromSupplierShopify } from '/opt/nodejs/models/fulfillment';
import { getCurrencyShopifyFmt, getCurrencyStripeFmt } from '/opt/nodejs/utils';
import { createUsageChargeShopify } from './graphql';

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

// ==============================================================================================================
// START: STRIPE PAYMENT OPERATIONS
// ==============================================================================================================

async function paySupplierStripe(
    supplierId: string,
    retailerId: string,
    payableAmount: number,
    stripeCurrency: string,
    client: PoolClient,
) {
    // https://docs.stripe.com/api/payment_intents/create
    const [supplierStripeAccountId, retailerStripeCustomerId, stripe] = await Promise.all([
        getStripeAccountId(supplierId, client),
        getStripeCustomerId(retailerId, client),
        getStripe(),
    ]);
    const paymentMethod = await getStripePaymentMethod(retailerStripeCustomerId);
    const event = await stripe.paymentIntents.create({
        amount: payableAmount,
        currency: stripeCurrency,
        off_session: true,
        confirm: true,
        customer: retailerStripeCustomerId,
        payment_method: paymentMethod,
        transfer_data: {
            destination: supplierStripeAccountId,
        },
    });
    return event.id;
}

async function recordStripePaymentDb(
    stripeEventId: string,
    orderPaid: number,
    shippingPaid: number,
    totalPaid: number,
    dbFulfillmentId: string,
    dbOrderId: string,
    client: PoolClient,
) {
    const query = `
        INSERT INTO "Payment" (
            "id",
            "orderId",
            "stripeEventId",
            "status",
            "orderPaid",
            "shippingPaid",
            "totalPaid",
            "fulfillmentId"
        )
        VALUES (
            $1,  -- id
            $2,  -- orderId
            $3,  -- stripeEventId
            $4,  -- status
            $5,  -- orderPaid
            $6,  -- shippingPaid
            $7,  -- totalPaid
            $8 -- fulfillmentId
        )
        RETURNING "id"
    `;
    const res = await client.query(query, [
        uuidv4(),
        dbOrderId,
        stripeEventId,
        ORDER_PAYMENT_STATUS.INITIATED,
        orderPaid,
        shippingPaid,
        totalPaid,
        dbFulfillmentId,
    ]);
    return res.rows[0].id as string;
}

async function processPaymentToSupplier(data: OrderDetailsData, client: PoolClient) {
    const {
        supplierSession,
        retailerSession,
        payments: { totalPayable, orderPayable, shippingPayable },
        currency: { stripeCurrency },
        dbFulfillmentId,
        orderDetails: { supplierShopifyOrderId },
    } = data;
    const stripeEventId = await paySupplierStripe(
        supplierSession.id,
        retailerSession.id,
        totalPayable,
        stripeCurrency,
        client,
    );
    const paymentId = await recordStripePaymentDb(
        stripeEventId,
        orderPayable,
        shippingPayable,
        totalPayable,
        dbFulfillmentId,
        supplierShopifyOrderId,
        client,
    );
    return paymentId;
}

// ==============================================================================================================
// START: SHOPIFY BILLING API TO PAY SYNQSELL OPERATIONS
// ==============================================================================================================
async function getRetailerProfitFromFulfillment(
    dbOrderId: string,
    supplierOrderLineItems: SupplierOrderLineItem[],
    client: PoolClient,
) {
    const orderLineItems = await getOrderLineItems(dbOrderId, client);
    const entireOrderLineItemLookup = createMapIdToRestObj(orderLineItems, 'supplierShopifyOrderLineItemId');
    const retailerProfit = supplierOrderLineItems.reduce((acc, lineItem) => {
        const { supplierShopifyOrderLineItemId, quantityFulfilled } = lineItem;
        const entireOrderLineItem = entireOrderLineItemLookup.get(supplierShopifyOrderLineItemId);
        if (!entireOrderLineItem) {
            throw new Error(
                `No order line item exists in the database for supplierShopifyOrderLineItemId ${supplierShopifyOrderLineItemId}`,
            );
        }
        const { retailerProfitPerUnit } = entireOrderLineItem;
        const retailerLineItemProfit = retailerProfitPerUnit * quantityFulfilled;
        return acc + retailerLineItemProfit;
    }, 0);
    return retailerProfit;
}

async function getShopifySubscriptionLineItemId(sessionId: string, client: PoolClient) {
    const query = `
        SELECT "shopifySubscriptionLineItemId" FROM "Billing"
        WHERE "sessionId" = $1
    `;
    const res = await client.query(query, [sessionId]);
    if (res.rows.length === 0) {
        throw new Error(`The user ${sessionId} is does not have a usage plan.`);
    }
    return res.rows[0].shopifySubscriptionLineItemId as string;
}

async function recordBillingTransactionDb(
    dbPaymentId: string,
    sessionId: string,
    shopifyUsageRecordId: string,
    amountPaid: number,
    shopifyCurrency: string,
    client: PoolClient,
) {
    const query = `
        INSERT INTO "BillingTransaction" (
            "id",
            "createdAt",
            "paymentId",
            "sessionId",
            "shopifyUsageRecordId",
            "amountPaid",
            "currencyCode"
        )
        VALUES (
            $1,  -- id
            $2,  -- createdAt
            $3,  -- paymentId
            $4,  -- sessionId
            $5,  -- shopifyUsageRecordId
            $6,  -- amountPaid
            $7  -- currencyCode
        )
    `;
    await client.query(query, [
        uuidv4(),
        new Date(),
        dbPaymentId,
        sessionId,
        shopifyUsageRecordId,
        amountPaid,
        shopifyCurrency,
    ]);
}

async function handleShopifyUsageCharge(
    dbPaymentId: string,
    shopifyCurrency: string,
    profit: number,
    session: Session,
    client: PoolClient,
) {
    const shopifySubscriptionLineItemId = await getShopifySubscriptionLineItemId(session.id, client);
    const amtToCharge = Number((profit * 0.05).toFixed(2));

    const shopifyUsageRecordId = await createUsageChargeShopify(
        shopifySubscriptionLineItemId,
        amtToCharge,
        shopifyCurrency,
        session,
    );
    if (shopifyUsageRecordId) {
        await recordBillingTransactionDb(
            dbPaymentId,
            session.id,
            shopifyUsageRecordId,
            amtToCharge,
            shopifyCurrency,
            client,
        );
    }
}

async function processPaymentToSynqSell(data: OrderDetailsData, dbPaymentId: string, client: PoolClient) {
    const {
        payments: { orderPayable, shippingPayable },
        orderDetails,
        orderLineItems,
        retailerSession,
        supplierSession,
        currency: { shopifyCurrency },
    } = data;

    const supplierProfit = orderPayable + shippingPayable;
    const retailerProfit = await getRetailerProfitFromFulfillment(orderDetails.id, orderLineItems, client);
    await Promise.all([
        handleShopifyUsageCharge(dbPaymentId, shopifyCurrency, retailerProfit, retailerSession, client),
        handleShopifyUsageCharge(dbPaymentId, shopifyCurrency, supplierProfit, supplierSession, client),
    ]);
}

export { getOrderDetails, processPaymentToSupplier, processPaymentToSynqSell };

export const exportsForTesting =
    process.env.NODE_ENV === 'test'
        ? {
              getRetailerSessionFromFulfillmentId,
              getOrderTotalQuantity,
              getShippingTotalPaidToDate,
              getShippingPayable,
              getOrderPayable,
              getOrderDetails,
              paySupplierStripe,
              recordStripePaymentDb,
              processPaymentToSupplier,
              getRetailerProfitFromFulfillment,
              getShopifySubscriptionLineItemId,
              recordBillingTransactionDb,
              handleShopifyUsageCharge,
              processPaymentToSynqSell,
          }
        : undefined;
