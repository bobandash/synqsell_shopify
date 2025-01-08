import { Payload } from '../../types';
import { PoolClient } from 'pg';
import { getOrderDetails, processPaymentToSupplier, processPaymentToSynqSell } from './helper';

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
    const data = await getOrderDetails(
        supplierShop,
        supplierShopifyOrderId,
        supplierShopifyFulfillmentId,
        supplierPayload,
        client,
    );
    const dbPaymentId = await processPaymentToSupplier(data, client);
    // SynqSell charges a 5% usage fee on the amount the retailer and supplier gross sales
    await processPaymentToSynqSell(data, dbPaymentId, client);
}

export default handlePaymentForDeliveredOrder;
