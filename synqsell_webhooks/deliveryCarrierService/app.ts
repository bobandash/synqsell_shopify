import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { PoolClient } from 'pg';
import { composeGid } from '@shopify/admin-graphql-api-utilities';
import initializePool from './db';
import { BackupResponse, EmptyResponse, SampleResponse } from './constants';
import { BuyerIdentityInput, Session, ShippingRateRequest } from './types';
import { getShippingRates, orderHasImportedItems } from './helper';

// https://shopify.dev/docs/api/admin-graphql/2024-07/objects/DeliveryCarrierService

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    let client: null | PoolClient = null;
    const request: ShippingRateRequest | null = event.body ? JSON.parse(event.body) : null;
    const sessionId = event.queryStringParameters?.sessionId ?? '';

    if (!sessionId) {
        throw new Error('Delivery carrier service callback url does not have a session id.');
    }

    if (!request) {
        return EmptyResponse;
    }
    try {
        const pool = initializePool();
        client = await pool.connect();
        const orderShopifyVariantDetails = request.rate.items.map(({ variant_id, quantity }) => ({
            id: composeGid('ProductVariant', variant_id),
            quantity,
        }));
        const orderShopifyVariantIds = orderShopifyVariantDetails.map(({ id }) => id);

        // get relevant data from the payload
        const destination = request.rate.destination;
        const buyerIdentityInput: BuyerIdentityInput = {
            buyerIdentity: {
                countryCode: destination.country,
                deliveryAddressPreferences: {
                    deliveryAddress: {
                        address1: destination.address1,
                        ...(destination.address2 ? { address2: destination.address2 } : {}),
                        city: destination.city,
                        country: destination.country,
                        province: destination.province,
                        zip: destination.postal_code,
                    },
                },
            },
        };

        const hasImportedItems = await orderHasImportedItems(orderShopifyVariantIds, client);
        if (!hasImportedItems) {
            return EmptyResponse;
        }
        const shippingRates = await getShippingRates(sessionId, orderShopifyVariantDetails, buyerIdentityInput, client);

        return {
            statusCode: 200,
            body: JSON.stringify(shippingRates),
        };
    } catch (error) {
        console.error((error as Error).message);
        return BackupResponse;
    } finally {
        if (client) {
            client.release();
        }
    }
};
