import { PoolClient } from 'pg';
import { getStripe, getStripePaymentMethod } from '../../../stripe';
import { getStripeAccountId } from '/opt/nodejs/models/stripeConnectAccount';
import { getStripeCustomerId } from '/opt/nodejs/models/stripeCustomerAccount';
import { ORDER_PAYMENT_STATUS } from '/opt/nodejs/constants';
import { v4 as uuidv4 } from 'uuid';

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

export { paySupplierStripe, recordStripePaymentDb };
