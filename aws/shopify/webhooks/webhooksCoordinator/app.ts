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
    } catch (error) {
        console.error(`Error invoking ${functionName}.`);
        throw error;
    }
}
// serves as coordinator from sqs to this function to invoke other lambda functions
export const lambdaHandler = async (event: Event) => {
    try {
        const invocations = event.Records.map(async (record) => {
            const shopifyEvent: ShopifyEvent = JSON.parse(record.body);
            const env = process.env.NODE_ENV ?? 'dev';
            const webhookTopic = shopifyEvent.detail.metadata['X-Shopify-Topic'];
            switch (webhookTopic) {
                case 'products/delete':
                    return invokeLambda(`${env}_products_delete`, shopifyEvent);
                case 'products/update':
                    return invokeLambda(`${env}_products_update`, shopifyEvent);
                case 'fulfillment_orders/order_routing_complete':
                    return invokeLambda(`${env}_order_routing_complete`, shopifyEvent);
                case 'fulfillments/create':
                    return invokeLambda(`${env}_fulfillments_create`, shopifyEvent);
                case 'orders/cancelled':
                    return invokeLambda(`${env}_orders_cancelled`, shopifyEvent);
                case 'fulfillments/update':
                    return invokeLambda(`${env}_fulfillments_update`, shopifyEvent);
                case 'app/uninstalled':
                    return invokeLambda(`${env}_app_uninstalled`, shopifyEvent);
                case 'shop/redact':
                    return invokeLambda(`${env}_shop_redact`, shopifyEvent);
                // we do not store any customers' data, so we can return a 200 request for these
                case 'customers/data_request':
                    return invokeLambda(`${env}_customers_data_request`, shopifyEvent);
                case 'customers/redact':
                    return invokeLambda(`${env}_customers_redact`, shopifyEvent);
                default:
                    console.error(`Webhook topic ${webhookTopic} is not handled.`);
                    return Promise.resolve();
            }
        });
        await Promise.all(invocations);
    } catch (error) {
        console.error(error);
        throw error;    // Throw error for it to go to DLQ and retries
    }
};
