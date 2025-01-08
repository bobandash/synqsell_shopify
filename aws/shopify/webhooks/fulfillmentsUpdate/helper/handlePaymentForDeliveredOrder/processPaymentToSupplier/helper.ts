// ==============================================================================================================
// START: SHOPIFY BILLING API TO PAY SYNQSELL OPERATIONS

import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createUsageChargeShopify } from '../graphql';
import { Session } from '/opt/nodejs/models/types';
import { SYNQSELL_COMMISSION } from '../../../constants';

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
    const amtToCharge = Number((profit * SYNQSELL_COMMISSION).toFixed(2));
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

export default handleShopifyUsageCharge;
export const exportsForTesting =
    process.env.NODE_ENV === 'test'
        ? { getShopifySubscriptionLineItemId, recordBillingTransactionDb, handleShopifyUsageCharge }
        : undefined;
