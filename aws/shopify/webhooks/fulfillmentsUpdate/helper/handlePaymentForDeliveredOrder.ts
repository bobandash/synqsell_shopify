import { PoolClient } from 'pg';
import { Payload } from '../types';
import { getStripe } from '../stripe';
import { v4 as uuidv4 } from 'uuid';
import { USAGE_CHARGE_MUTATION } from '../graphql';
import { AppUsageRecordCreateMutation } from '../types/admin.generated';
import { getOrderLineItems } from '/opt/nodejs/models/orderLineItem';
import { getStripeAccountId } from '/opt/nodejs/models/stripeConnectAccount';
import { getStripeCustomerId } from '/opt/nodejs/models/stripeCustomerAccount';
import {
    createMapIdToRestObj,
    getCurrencyShopifyFmt,
    getCurrencyStripeFmt,
    mutateAndValidateGraphQLData,
} from '/opt/nodejs/utils';
import type { Order, Session } from '/opt/nodejs/models/types';
import { ORDER_PAYMENT_STATUS } from '/opt/nodejs/constants';
import { getRetailerSessionFromFulfillment, getSessionFromShop } from '/opt/nodejs/models/session';
import { getOrderFromSupplierShopifyOrderId } from '/opt/nodejs/models/order';
import { getFulfillmentIdFromSupplierShopify } from '/opt/nodejs/models/fulfillment';
import { hasPaymentFromFulfillmentId } from '/opt/nodejs/models/payment';

type SupplierOrderLineItem = {
    supplierShopifyOrderLineItemId: string;
    quantityFulfilled: number;
};

type PayableAmounts = {
    shippingPayableAmount: number;
    orderPayableAmount: number;
};

// ==============================================================================================================
// START: HELPER FUNCTIONS FOR INITIAL DATA
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

// ==============================================================================================================
// START: CALCULATE AMOUNT TO PAY SUPPLIER LOGIC
// ==============================================================================================================

async function getOrderTotalQuantity(dbOrderId: string, client: PoolClient) {
    const query = `
        SELECT SUM(quantity) as "totalQty"
        FROM "OrderLineItem"
        WHERE "orderId" = $1
    `;
    const result = await client.query(query, [dbOrderId]);
    if (result.rows.length === 0 || result.rows[0].totalQty === 0) {
        throw new Error(`dbOrderId ${dbOrderId} has no quantity`);
    }

    return result.rows[0].totalQty as number;
}

async function getShippingTotalPaidToDate(dbOrderId: string, client: PoolClient) {
    const query = `
        SELECT SUM("shippingPaid") AS totalShippingPaid
        FROM "Payment"
        WHERE "orderId" = $1
    `;
    const res = await client.query(query, [dbOrderId]);
    if (res.rows.length === 0) {
        return 0;
    }
    return res.rows[0].totalShippingPaid as number;
}

async function getShippingPayableAmtForSupplier(
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
    // TODO: Figure out whether or not we need to increase the threshold or make a dynamic way of calculating the threshold
    if (Math.abs(difference) <= 0.1) {
        shippingPayableAmount += difference;
    }
    return Math.max(shippingPayableAmount, 0);
}

async function getOrderPayableAmtForSupplier(
    dbOrderId: string,
    supplierOrderLineItems: SupplierOrderLineItem[],
    client: PoolClient,
) {
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

async function getSupplierPayableAmounts(
    orderDetails: Order,
    orderLineItems: SupplierOrderLineItem[],
    client: PoolClient,
) {
    const totalFulfillmentQty = orderLineItems.reduce((acc, { quantityFulfilled }) => acc + quantityFulfilled, 0);
    const [shippingPayableAmount, orderPayableAmount] = await Promise.all([
        getShippingPayableAmtForSupplier(orderDetails.id, orderDetails.shippingCost, totalFulfillmentQty, client),
        getOrderPayableAmtForSupplier(orderDetails.id, orderLineItems, client),
    ]);

    return {
        shippingPayableAmount,
        orderPayableAmount,
    };
}

// ==============================================================================================================
// END: CALCULATE AMOUNT TO PAY SUPPLIER LOGIC
// ==============================================================================================================

// ==============================================================================================================
// START: PAY SUPPLIER USING STRIPE PAYMENTS/CONNECT LOGIC AND STORE IN DB
// ==============================================================================================================

// not sure if customerId is considered PII, but it's also irrelevant w/out api key
async function getStripePaymentMethod(customerId: string) {
    const stripe = await getStripe();
    const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
    });
    if (paymentMethods.data.length === 0) {
        throw new Error(`No payment methods exist for customer ${customerId}`);
    }
    return paymentMethods.data[0].id;
}

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

async function recordStripePaymentInDb(
    stripeEventId: string,
    orderPaid: number,
    shippingPaid: number,
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
            "fulfillmentId",
        )
        VALUES (
            $1,  -- id
            $2,  -- orderId
            $3,  -- stripeEventId
            $4,  -- status
            $5,  -- orderPaid
            $6,  -- shippingPaid
            $7,  -- totalPaid
            $8, -- fulfillmentId
        )
        RETURNING "id"
    `;
    const totalPaid = orderPaid + shippingPaid;
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

// stripe payment is flow of commission from retailer to supplier
async function handleStripePayment(
    supplierId: string,
    retailerId: string,
    payableAmounts: PayableAmounts,
    stripeCurrency: string,
    dbFulfillmentId: string,
    dbOrderId: string,
    client: PoolClient,
) {
    try {
        const { shippingPayableAmount, orderPayableAmount } = payableAmounts;
        const totalPayableAmount = shippingPayableAmount + orderPayableAmount;
        const stripeEventId = await paySupplierStripe(
            supplierId,
            retailerId,
            totalPayableAmount,
            stripeCurrency,
            client,
        );
        const dbPaymentId = await recordStripePaymentInDb(
            stripeEventId,
            orderPayableAmount,
            shippingPayableAmount,
            dbFulfillmentId,
            dbOrderId,
            client,
        );
        return dbPaymentId;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to handle stripe payment for fulfillment id ${dbFulfillmentId}.`);
    }
}

// ==============================================================================================================
// START: USE SHOPIFY BILLING API TO PAY SYNQSELL APP
// ==============================================================================================================
async function getShopifySubscriptionLineItemId(sessionId: string, client: PoolClient) {
    try {
        const query = `
            SELECT "shopifySubscriptionLineItemId" FROM "Billing"
            WHERE "sessionId" = $1
        `;
        const res = await client.query(query);
        if (res.rows.length === 0) {
            throw new Error('The user is not subscribed to the Shopify Basic Usage plan.');
        }
        return res.rows[0].shopifySubscriptionLineItemId as string;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to get subscription line id for session ${sessionId}.`);
    }
}

async function createUsageChargeShopify(
    shopifySubscriptionLineId: string,
    amtToBill: number,
    shopifyCurrency: string,
    session: Session,
) {
    try {
        // The currently capped usage amount is $100 per month, which means SynqSell as a platform would have to help the retailer/supplier achieve $2k/month (5% commission) after payout
        // for the USAGE_CHARGE_MUTATION, it throws an error if the amount goes over, e.g. retailer paid $99 already; the transaction payable is $1.01 --> mutation fails
        // right now, we're just going to let it fail because currency conversion to USD is not built in our data model yet
        const res = await mutateAndValidateGraphQLData<AppUsageRecordCreateMutation>(
            session.shop,
            session.accessToken,
            USAGE_CHARGE_MUTATION,
            {
                description: 'SynqSell usage charge for commission on delivered orders.',
                price: {
                    amount: amtToBill,
                    currencyCode: shopifyCurrency,
                },
                subscriptionLineItemId: shopifySubscriptionLineId,
            },
            'Failed to create a usage charge to pay SynqSell from retailer.',
        );
        return res.appUsageRecordCreate?.appUsageRecord?.id ?? null;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function recordBillingTransactionInDb(
    dbPaymentId: string,
    sessionid: string,
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
            $7,  -- currencyCode
        )
    `;
    await client.query(query, [
        uuidv4(),
        new Date(),
        dbPaymentId,
        sessionid,
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
    const shopifyUsageRecordId = await createUsageChargeShopify(
        shopifySubscriptionLineItemId,
        profit,
        shopifyCurrency,
        session,
    );
    if (shopifyUsageRecordId) {
        await recordBillingTransactionInDb(
            dbPaymentId,
            session.id,
            shopifyUsageRecordId,
            profit,
            shopifyCurrency,
            client,
        );
    }
}

// ==============================================================================================================
// START: END SHOPIFY BILLING API TO PAY SYNQSELL APP
// ==============================================================================================================

// TODO: refactor and add final update order status to completed if everything has been paid
async function handlePaymentForDeliveredOrder(
    supplierShop: string,
    supplierShopifyOrderId: string,
    supplierShopifyFulfillmentId: string,
    supplierPayload: Payload,
    client: PoolClient,
) {
    const orderLineItems: SupplierOrderLineItem[] = supplierPayload.line_items.map((lineItem) => ({
        supplierShopifyOrderLineItemId: lineItem.admin_graphql_api_id,
        quantityFulfilled: lineItem.quantity,
    }));

    const [dbFulfillmentId, supplierSession, orderDetails] = await Promise.all([
        getFulfillmentIdFromSupplierShopify(supplierShopifyFulfillmentId, client),
        getSessionFromShop(supplierShop, client),
        getOrderFromSupplierShopifyOrderId(supplierShopifyOrderId, client),
    ]);
    const [retailerSession, hasFulfillmentBeenPaid, supplierPayableAmounts] = await Promise.all([
        getRetailerSessionFromFulfillment(dbFulfillmentId, client),
        hasPaymentFromFulfillmentId(dbFulfillmentId, client),
        getSupplierPayableAmounts(orderDetails, orderLineItems, client),
    ]);

    if (hasFulfillmentBeenPaid) {
        console.error(`Fulfillment ${supplierShopifyFulfillmentId} has already been paid`);
        return;
    }

    const currency = orderDetails.currency;
    const stripeCurrency = getCurrencyStripeFmt(currency);
    const shopifyCurrency = getCurrencyShopifyFmt(currency);
    // retailer has to pay the supplier the agreed upon proceeds
    const dbPaymentId = await handleStripePayment(
        supplierSession.id,
        retailerSession.id,
        supplierPayableAmounts,
        stripeCurrency,
        dbFulfillmentId,
        orderDetails.id,
        client,
    );

    const supplierProfit = supplierPayableAmounts.orderPayableAmount + supplierPayableAmounts.shippingPayableAmount;

    // pay SynqSell from supplier and retailer billing api
    const retailerProfit = await getRetailerProfitFromFulfillment(orderDetails.id, orderLineItems, client);
    await Promise.all([
        handleShopifyUsageCharge(dbPaymentId, shopifyCurrency, retailerProfit, retailerSession, client),
        handleShopifyUsageCharge(dbPaymentId, shopifyCurrency, supplierProfit, supplierSession, client),
    ]);
}

export default handlePaymentForDeliveredOrder;
