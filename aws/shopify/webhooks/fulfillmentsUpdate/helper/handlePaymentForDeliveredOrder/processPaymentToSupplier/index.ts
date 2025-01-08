import { PoolClient } from 'pg';
import { OrderDetailsData, SupplierOrderLineItem } from '../../../types';
import handleShopifyUsageCharge from './helper';
import { getOrderLineItems } from '/opt/nodejs/models/orderLineItem';
import { createMapIdToRestObj } from '/opt/nodejs/utils';

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

export default processPaymentToSynqSell;
export const exportsForTesting =
    process.env.NODE_ENV === 'test' ? { getRetailerProfitFromFulfillment, processPaymentToSynqSell } : undefined;
