import { ShopifyEvent, Event } from './types';
import { Lambda } from 'aws-sdk';

const lambda = new Lambda();

async function invokeLambda(functionName: string, payload: any) {
    const params = {
        FunctionName: functionName,
        InvocationType: 'Event',
        Payload: JSON.stringify(payload),
    };

    try {
        await lambda.invoke(params).promise();
        console.log(`Successfully invoked ${functionName}`);
    } catch (error) {
        console.error(error);
        console.error(payload);
        console.error(`Error invoking ${functionName}.`);
    }
}
// serves as coordinator from sqs to this function to invoke other lambda functions
export const lambdaHandler = async (event: Event) => {
    try {
        const invocations = event.Records.map(async (record) => {
            const shopifyEvent: ShopifyEvent = JSON.parse(record.body);
            const webhookTopic = shopifyEvent.detail.metadata['X-Shopify-Topic'];
            switch (webhookTopic) {
                case 'products/delete':
                    return invokeLambda('products_delete', shopifyEvent);
                case 'products/update':
                    return invokeLambda('products_update', shopifyEvent);
                case 'fulfillment_orders/order_routing_complete':
                    return invokeLambda('order_routing_complete', shopifyEvent);
                case 'fulfillments/create':
                    return invokeLambda('fulfillments_create', shopifyEvent);
                case 'orders/cancelled':
                    return invokeLambda('orders_cancelled', shopifyEvent);
                case 'fulfillments/update':
                    return invokeLambda('fulfillments_update', shopifyEvent);
                case 'app/uninstalled':
                    return invokeLambda('app_uninstalled', shopifyEvent);
                case 'shop/redact':
                    break;
                // we do not store any customers' data, so we can return a 200 request for these
                case 'customers/data_request':
                    return invokeLambda('customers_data_request', shopifyEvent);
                case 'customers/redact':
                    return invokeLambda('customers_redact', shopifyEvent);
                default:
                    console.error(`Webhook topic ${webhookTopic} is not handled.`);
                    return Promise.resolve();
            }
        });
        await Promise.all(invocations);
    } catch (error) {
        console.error(error);
    }
};
