import { PoolClient } from 'pg';
import { getDbFulfillmentIdFromSupplier, getSessionFromShop } from './util';
import { Payload, Session } from '../types';
import { getStripe } from '../stripe';
import { v4 as uuidv4 } from 'uuid';
import { ORDER_PAYMENT_STATUS } from '../constants';
import { createMapToRestObj, mutateAndValidateGraphQLData } from '../util';
import { USAGE_CHARGE_MUTATION } from '../graphql';
import { AppUsageRecordCreateMutation } from '../types/admin.generated';

type SupplierOrderLineItem = {
    supplierShopifyOrderLineItemId: string;
    quantityFulfilled: number;
};

type OrderDatabase = {
    id: string;
    currency: string;
    retailerShopifyFulfillmentOrderId: string;
    supplierShopifyOrderId: string;
    retailerId: string;
    supplierId: string;
    shippingCost: number;
    paymentStatus: string;
    createdAt: Date;
    updatedAt: Date;
};

type OrderLineItemDetail = {
    id: string;
    retailerShopifyVariantId: string;
    supplierShopifyVariantId: string;
    retailPricePerUnit: number;
    retailerProfitPerUnit: number;
    supplierProfitPerUnit: number;
    retailerShopifyOrderLineItemId: string;
    supplierShopifyOrderLineItemId: string;
    quantity: number;
    quantityFulfilled: number;
    quantityPaid: number;
    quantityCancelled: number;
    orderId: string;
    priceListId: string;
};

type PayableAmounts = {
    shippingPayableAmount: number;
    orderPayableAmount: number;
};

// ==============================================================================================================
// START: HELPER FUNCTIONS FOR INITIAL DATA
// ==============================================================================================================
// stripe api only accepts currency code in lower case fmt
function getCurrencyStripeFmt(currency: string) {
    return currency.toLowerCase();
}

// shopify api only accepts currency code in upper case fmt
function getCurrencyShopifyFmt(currency: string) {
    return currency.toUpperCase();
}

async function getRetailerSessionFromFulfillmentId(dbFulfillmentId: string, client: PoolClient) {
    try {
        const query = `
          SELECT "Session".* FROM "Fulfillment"
          INNER JOIN "Order" ON "Order"."id" = "Fulfillment"."orderId"
          INNER JOIN "Session" ON "Session"."id" = "Order"."retailerId"
          WHERE "Fulfillment"."id" = $1
          LIMIT 1
        `;
        const res = await client.query(query, [dbFulfillmentId]);
        if (res.rows.length === 0) {
            throw new Error(`No retailer session exists for dbFulfillmentId ${dbFulfillmentId}.`);
        }
        return res.rows[0] as Session;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to get retailer session from ${dbFulfillmentId} dbFulfillmentId.`);
    }
}

async function getOrderCurrency(supplierShopifyOrderId: string, client: PoolClient) {
    try {
        const query = `
            SELECT "currency" FROM "Order"
            WHERE "supplierShopifyOrderId" = $1
        `;
        const res = await client.query(query, [supplierShopifyOrderId]);
        if (res.rows.length === 0) {
            throw new Error(`Order with supplierShopifyOrderId ${supplierShopifyOrderId} does not exist.`);
        }
        // stripe requires the currency in letter case 2-3 char format
        const currency: string = res.rows[0].currency;
        return currency;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to get order currency from supplierShopifyOrderId ${supplierShopifyOrderId}`);
    }
}

async function getDbOrderDetails(supplierShopifyOrderId: string, client: PoolClient) {
    try {
        const query = `
            SELECT * FROM "Order"
            WHERE "supplierShopifyOrderId" = $1
            LIMIT 1
        `;
        const res = await client.query(query, [supplierShopifyOrderId]);
        if (res.rows.length === 0) {
            throw new Error(`No order exists for supplierShopifyOrderId ${supplierShopifyOrderId}.`);
        }
        return res.rows[0] as OrderDatabase;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to get database order details from ${supplierShopifyOrderId}.`);
    }
}

async function hasStripePayment(dbFulfillmentId: string, client: PoolClient) {
    try {
        const query = `
          SELECT * FROM "Payment"
          WHERE "fulfillmentId" = $1
          LIMIT 1
        `;
        const res = await client.query(query, [dbFulfillmentId]);
        return res.rows.length > 0;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to check if fulfillment id ${dbFulfillmentId} has stripe payment.`);
    }
}

async function getRetailerProfitFromFulfillment(
    dbOrderId: string,
    supplierOrderLineItems: SupplierOrderLineItem[],
    client: PoolClient,
) {
    try {
        const entireOrderLineItemDetails = await getOrderLineItemDetails(dbOrderId, client);
        const entireOrderLineItemLookup = createMapToRestObj(
            entireOrderLineItemDetails,
            'supplierShopifyOrderLineItemId',
        );
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
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to retailer profit from supplier order ${dbOrderId}.`);
    }
}

// ==============================================================================================================
// START: CALCULATE AMOUNT TO PAY SUPPLIER LOGIC
// ==============================================================================================================

async function getOrderTotalQuantity(dbOrderId: string, client: PoolClient) {
    try {
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
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to get total order quantity from dbOrderId ${dbOrderId}.`);
    }
}

async function getShippingTotalPaidToDate(dbOrderId: string, client: PoolClient) {
    try {
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
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to get shipping total paid to date ${dbOrderId}.`);
    }
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

async function getOrderLineItemDetails(dbOrderId: string, client: PoolClient) {
    try {
        const query = `
        SELECT * FROM "OrderLineItem" 
        WHERE "orderId" = $1
      `;
        const res = await client.query(query, [dbOrderId]);
        if (res.rows.length === 0) {
            throw new Error(`No order line items exist for dbOrder ${dbOrderId}.`);
        }
        return res.rows as OrderLineItemDetail[];
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to get database order line items from ${dbOrderId}.`);
    }
}

async function getOrderPayableAmtForSupplier(
    dbOrderId: string,
    supplierOrderLineItems: SupplierOrderLineItem[],
    client: PoolClient,
) {
    try {
        const entireOrderLineItemDetails = await getOrderLineItemDetails(dbOrderId, client);
        const entireOrderLineItemLookup = createMapToRestObj(
            entireOrderLineItemDetails,
            'supplierShopifyOrderLineItemId',
        );
        const orderPayableAmount = supplierOrderLineItems.reduce((acc, lineItem) => {
            const { supplierShopifyOrderLineItemId, quantityFulfilled } = lineItem;
            const entireOrderLineItem = entireOrderLineItemLookup.get(supplierShopifyOrderLineItemId);
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
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to order payable amount from ${dbOrderId}.`);
    }
}

async function getSupplierPayableAmounts(
    orderDetails: OrderDatabase,
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
async function getStripeAccountId(supplierId: string, client: PoolClient) {
    try {
        const query = `
          SELECT "stripeAccountId" FROM "StripeConnectAccount"
          WHERE "supplierId" = $1
          LIMIT 1
        `;
        const res = await client.query(query, [supplierId]);
        if (res.rows.length === 0) {
            throw new Error(`No stripe account id exists for supplierId ${supplierId}.`);
        }
        return res.rows[0].stripeAccountId as string;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to check if supplierId ${supplierId} has stripe account id.`);
    }
}

async function getStripeCustomerId(retailerId: string, client: PoolClient) {
    try {
        const query = `
          SELECT "stripeCustomerId" FROM "StripeCustomerAccount"
          WHERE "retailerId" = $1
          LIMIT 1
      `;
        const res = await client.query(query, [retailerId]);
        if (res.rows.length === 0) {
            throw new Error(`No stripe customer id id exists for retailerId ${retailerId}.`);
        }
        return res.rows[0].stripeCustomerId as string;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to get customer id from retailer id ${retailerId}.`);
    }
}

// not sure if customerId is considered PII, but it's also irrelevant w/out api key
async function getStripePaymentMethod(customerId: string) {
    try {
        const stripe = await getStripe();
        const paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
        });
        if (paymentMethods.data.length === 0) {
            throw new Error(`No payment methods exist for customer ${customerId}`);
        }
        return paymentMethods.data[0].id;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to get stripe payment method from customer id ${customerId}`);
    }
}

async function paySupplierStripe(
    supplierId: string,
    retailerId: string,
    payableAmount: number,
    stripeCurrency: string,
    client: PoolClient,
) {
    try {
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
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to pay supplier ${supplierId} from retailer ${retailerId}'s stripe account.`);
    }
}

async function recordStripePaymentInDb(
    stripeEventId: string,
    orderPaid: number,
    shippingPaid: number,
    dbFulfillmentId: string,
    dbOrderId: string,
    client: PoolClient,
) {
    try {
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
    } catch (error) {
        console.error(error);
        throw new Error('Failed to add payment to database.');
    }
}

// stripe payment is flow of commission from retailer to supplier
async function handleStripePayment(
    supplierId: string,
    retailerId: string,
    payableAmounts: PayableAmounts,
    currency: string,
    dbFulfillmentId: string,
    dbOrderId: string,
    client: PoolClient,
) {
    try {
        const { shippingPayableAmount, orderPayableAmount } = payableAmounts;
        const totalPayableAmount = shippingPayableAmount + orderPayableAmount;
        const stripeCurrency = getCurrencyStripeFmt(currency);
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
        // TODO: Use a less hacky solution in the future
        // Basically, the currently capped usage amount is $100 per month, which means SynqSell as a platform would have to help the retailer/supplier achieve $2k/month (5% commission) after payout
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
    try {
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
    } catch (error) {
        console.error(error);
        throw new Error('Failed to add Shopify billing transaction to database.');
    }
}

async function handleShopifyUsageCharge(
    dbPaymentId: string,
    shopifyCurrency: string,
    profit: number,
    session: Session,
    client: PoolClient,
) {
    try {
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
    } catch (error) {
        console.error(error);
        throw new Error('Failed to handle supplier usage charge.');
    }
}

// ==============================================================================================================
// START: END SHOPIFY BILLING API TO PAY SYNQSELL APP
// ==============================================================================================================

async function handlePaymentForDeliveredOrder(
    supplierShop: string,
    supplierShopifyOrderId: string,
    supplierShopifyFulfillmentId: string,
    supplierPayload: Payload,
    client: PoolClient,
) {
    try {
        const orderLineItems: SupplierOrderLineItem[] = supplierPayload.line_items.map((lineItem) => ({
            supplierShopifyOrderLineItemId: lineItem.admin_graphql_api_id,
            quantityFulfilled: lineItem.quantity,
        }));

        const [dbFulfillmentId, supplierSession, orderDetails, currency] = await Promise.all([
            getDbFulfillmentIdFromSupplier(supplierShopifyFulfillmentId, client),
            getSessionFromShop(supplierShop, client),
            getDbOrderDetails(supplierShopifyOrderId, client),
            getOrderCurrency(supplierShopifyOrderId, client),
        ]);
        const [retailerSession, hasFulfillmentBeenPaid, supplierPayableAmounts] = await Promise.all([
            getRetailerSessionFromFulfillmentId(dbFulfillmentId, client),
            hasStripePayment(dbFulfillmentId, client),
            getSupplierPayableAmounts(orderDetails, orderLineItems, client),
        ]);

        if (hasFulfillmentBeenPaid) {
            console.error(`Fulfillment ${supplierShopifyFulfillmentId} has already been paid`);
            return;
        }

        // retailer has to pay the supplier the agreed upon proceeds
        const dbPaymentId = await handleStripePayment(
            supplierSession.id,
            retailerSession.id,
            supplierPayableAmounts,
            currency,
            dbFulfillmentId,
            orderDetails.id,
            client,
        );

        const supplierProfit = supplierPayableAmounts.orderPayableAmount + supplierPayableAmounts.shippingPayableAmount;
        const shopifyCurrency = getCurrencyShopifyFmt(currency);
        // pay SynqSell from supplier and retailer billing api
        const retailerProfit = await getRetailerProfitFromFulfillment(orderDetails.id, orderLineItems, client);
        await Promise.all([
            handleShopifyUsageCharge(dbPaymentId, shopifyCurrency, retailerProfit, retailerSession, client),
            handleShopifyUsageCharge(dbPaymentId, shopifyCurrency, supplierProfit, supplierSession, client),
        ]);

        // TODO: refactor and add final update order status to completed if everything has been paid
    } catch (error) {
        console.error(error);
        throw new Error(
            `Failed to handle retailer and supplier Stripe + Shopify payments for delivered order ${supplierShopifyOrderId} and fulfillment id ${supplierShopifyFulfillmentId}.`,
        );
    }
}

export default handlePaymentForDeliveredOrder;
