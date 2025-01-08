import { PoolClient } from 'pg';
import { OrderDetailsData } from '../../../types';
import { paySupplierStripe, recordStripePaymentDb } from './helper';

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

export default processPaymentToSupplier;
