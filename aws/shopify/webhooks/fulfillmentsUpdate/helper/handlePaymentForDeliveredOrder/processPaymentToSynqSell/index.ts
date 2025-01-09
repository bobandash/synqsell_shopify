import { PoolClient } from 'pg';
import { OrderDetailsData } from '../../../types';
import { paySupplierStripe, recordStripePaymentDb } from './helper';
import { getOrderFromSupplierShopifyOrderId } from '/opt/nodejs/models/order';

async function processPaymentToSupplier(data: OrderDetailsData, client: PoolClient) {
    const {
        supplierSession,
        retailerSession,
        payments: { totalPayable, orderPayable, shippingPayable },
        currency: { stripeCurrency },
        orderDetails: { supplierShopifyOrderId },
        dbFulfillmentId,
    } = data;
    const dbOrderId = (await getOrderFromSupplierShopifyOrderId(supplierShopifyOrderId, client)).id;

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
        dbOrderId,
        client,
    );
    return paymentId;
}

export default processPaymentToSupplier;
