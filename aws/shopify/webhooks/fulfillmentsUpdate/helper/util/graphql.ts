import {
    CANCEL_FULFILLMENT_MUTATION,
    CREATE_FULFILLMENT_FULFILLMENT_ORDER_MUTATION,
    OPEN_FULFILLMENT_ORDER_MUTATION,
} from '../../graphql';
import {
    FulfillmentCancelMutation,
    FulfillmentCreateV2Mutation,
    FulfillmentOrderOpenMutation,
} from '../../types/admin.generated';
import { Session } from '/opt/nodejs/models/types';
import { mutateAndValidateGraphQLData } from '/opt/nodejs/utils';

type SessionGraphQLDetail = {
    shop: string;
    accessToken: string;
};

export type FulfillmentInput = {
    trackingInfo: {
        company: string | null;
        numbers: string[];
        urls: string[];
    };
    lineItemsByFulfillmentOrder: {
        fulfillmentOrderId: string;
        fulfillmentOrderLineItems: {
            id: string;
            quantity: number;
        }[];
    };
};

export async function cancelFulfillmentShopify(session: Session | SessionGraphQLDetail, shopifyFulfillmentId: string) {
    const res = await mutateAndValidateGraphQLData<FulfillmentCancelMutation>(
        session.shop,
        session.accessToken,
        CANCEL_FULFILLMENT_MUTATION,
        {
            id: shopifyFulfillmentId,
        },
        `Could not cancel fulfillment for ${shopifyFulfillmentId}`,
    );
    return res;
}

export async function openFulfillmentShopify(session: Session | SessionGraphQLDetail, shopifyFulfillmentId: string) {
    const res = await mutateAndValidateGraphQLData<FulfillmentOrderOpenMutation>(
        session.shop,
        session.accessToken,
        OPEN_FULFILLMENT_ORDER_MUTATION,
        {
            id: shopifyFulfillmentId,
        },
        `Could not open fulfillment for ${shopifyFulfillmentId}`,
    );
    return res;
}

export async function createFulfillmentShopify(session: Session | SessionGraphQLDetail, input: FulfillmentInput) {
    const res = await mutateAndValidateGraphQLData<FulfillmentCreateV2Mutation>(
        session.shop,
        session.accessToken,
        CREATE_FULFILLMENT_FULFILLMENT_ORDER_MUTATION,
        { fulfillment: input },
        "Failed to create fulfillment for retailer from supplier's data",
    );
    const newRetailerShopifyFulfillmentId = res.fulfillmentCreateV2?.fulfillment?.id;
    if (!newRetailerShopifyFulfillmentId) {
        throw new Error('No shopify fulfillment id was created from mutation.');
    }
    return newRetailerShopifyFulfillmentId;
}
