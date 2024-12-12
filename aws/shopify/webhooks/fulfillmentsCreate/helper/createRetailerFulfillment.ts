import { PoolClient } from 'pg';
import { Session } from '../types';
import {
    FulfillmentCreateV2Mutation,
    FulfillmentDetailsQuery,
    SubsequentFulfillmentDetailsQuery,
} from '../types/admin.generated';
import {
    CREATE_FULFILLMENT_FULFILLMENT_ORDER_MUTATION,
    GET_FULFILLMENT_DETAILS,
    GET_SUBSEQUENT_FULFILLMENT_DETAILS,
} from '../graphql';
import { createMapIdToRestObj, fetchAndValidateGraphQLData, mutateAndValidateGraphQLData } from '/opt/nodejs/utils';
import { v4 as uuidv4 } from 'uuid';
import { getOrderFromSupplierShopifyOrderId, getRetailerSessionFromSupplierOrder } from '/opt/nodejs/models/order';

type FulfillmentDetailLineItem = {
    shopifyLineItemId: string;
    quantity: number;
};

type TrackingInfo = {
    company: string;
    number: string;
    url: string;
};

type FulfillmentDetails = {
    trackingInfo: TrackingInfo[];
    lineItems: FulfillmentDetailLineItem[];
};

type SupplierAndRetailerOrderLineItem = {
    retailerShopifyOrderLineItemId: string;
    supplierShopifyOrderLineItemId: string;
};

// ==============================================================================================================
// START: ADD FULFILLMENT DETAILS HELPER FUNCTIONS
// ==============================================================================================================

// TODO: Refactor this file in the future if need testing, it's too verbose / too much is going on
async function getFulfillmentDetails(shopifyFulfillmentId: string, session: Session): Promise<FulfillmentDetails> {
    const fulfillmentDetailLineItems: FulfillmentDetailLineItem[] = [];
    const initialFulfillmentDetails = await fetchAndValidateGraphQLData<FulfillmentDetailsQuery>(
        session.shop,
        session.accessToken,
        GET_FULFILLMENT_DETAILS,
        {
            id: shopifyFulfillmentId,
        },
    );
    const initialPageInfo = initialFulfillmentDetails.fulfillment?.fulfillmentLineItems.pageInfo;
    const trackingInfo: TrackingInfo[] =
        initialFulfillmentDetails.fulfillment?.trackingInfo.map((tracking) => {
            return { company: tracking.company ?? '', number: tracking.number ?? '', url: tracking.url ?? '' };
        }) ?? [];

    initialFulfillmentDetails.fulfillment?.fulfillmentLineItems.edges.forEach(({ node }) => {
        fulfillmentDetailLineItems.push({
            shopifyLineItemId: node.lineItem.id,
            quantity: node.quantity ?? 0,
        });
    });

    let hasMore = initialPageInfo?.hasNextPage ?? false;
    let endCursor = initialPageInfo?.endCursor ?? null;

    while (hasMore && endCursor) {
        const subsequentFulfillmentDetails = await fetchAndValidateGraphQLData<SubsequentFulfillmentDetailsQuery>(
            session.shop,
            session.accessToken,
            GET_SUBSEQUENT_FULFILLMENT_DETAILS,
            {
                id: shopifyFulfillmentId,
                after: endCursor,
            },
        );
        const subsequentPageInfo = subsequentFulfillmentDetails.fulfillment?.fulfillmentLineItems.pageInfo;
        subsequentFulfillmentDetails.fulfillment?.fulfillmentLineItems.edges.forEach(({ node }) => {
            fulfillmentDetailLineItems.push({
                shopifyLineItemId: node.lineItem.id,
                quantity: node.quantity ?? 0,
            });
        });
        hasMore = subsequentPageInfo?.hasNextPage ?? false;
        endCursor = subsequentPageInfo?.endCursor ?? null;
    }

    const fulfillmentDetails = {
        trackingInfo: trackingInfo,
        lineItems: fulfillmentDetailLineItems,
    };

    return fulfillmentDetails;
}

async function getSupplierAndRetailerOrderLineItems(supplierShopifyOrderId: string, client: PoolClient) {
    const query = `
        SELECT 
        "OrderLineItem"."retailerShopifyOrderLineItemId" AS "retailerShopifyOrderLineItemId",
        "OrderLineItem"."supplierShopifyOrderLineItemId" AS "supplierShopifyOrderLineItemId"
        FROM "Order"
        INNER JOIN "OrderLineItem" ON "OrderLineItem"."orderId" = "Order"."id"
        WHERE "supplierShopifyOrderId" = $1
    `;
    const queryRes = await client.query(query, [supplierShopifyOrderId]);
    if (queryRes.rows.length === 0) {
        throw new Error(`There are no order line items for ${supplierShopifyOrderId}.`);
    }
    return queryRes.rows as SupplierAndRetailerOrderLineItem[];
}

async function addRetailerFulfillmentOnShopify(
    supplierShopifyFulfillmentId: string,
    supplierSession: Session,
    retailerSession: Session,
    supplierShopifyOrderId: string,
    client: PoolClient,
) {
    const [supplierFulfillmentDetails, supplierAndRetailerOrderLineItems, order] = await Promise.all([
        getFulfillmentDetails(supplierShopifyFulfillmentId, supplierSession),
        getSupplierAndRetailerOrderLineItems(supplierShopifyOrderId, client),
        getOrderFromSupplierShopifyOrderId(supplierShopifyOrderId, client),
    ]);
    const orderLineItemsIdMap = createMapIdToRestObj(
        supplierAndRetailerOrderLineItems,
        'supplierShopifyOrderLineItemId',
    ); // key = supplierShopifyOrderLineItemId, value = {retailerShopifyOrderLineItemId: string}

    const { trackingInfo, lineItems } = supplierFulfillmentDetails;
    const fulfillmentCreateInput = {
        notifyCustomer: true,
        ...(trackingInfo.length > 0 && {
            trackingInfo: trackingInfo.reduce(
                (acc, tracking) => {
                    return {
                        company: tracking.company,
                        numbers: [...acc.numbers, tracking.number],
                        urls: [...acc.urls, tracking.url],
                    };
                },
                { company: '', numbers: [] as string[], urls: [] as string[] },
            ),
        }),
        lineItemsByFulfillmentOrder: {
            fulfillmentOrderId: order.retailerShopifyFulfillmentOrderId,
            fulfillmentOrderLineItems: lineItems.map(({ shopifyLineItemId, quantity }) => {
                const retailerFulfillmentOrderLineItemId =
                    orderLineItemsIdMap.get(shopifyLineItemId)?.retailerShopifyOrderLineItemId;
                if (!retailerFulfillmentOrderLineItemId) {
                    throw new Error(
                        `Supplier line item id ${shopifyLineItemId} has no matching retailer fulfillment order line item.`,
                    );
                }
                return {
                    id: retailerFulfillmentOrderLineItemId,
                    quantity: quantity,
                };
            }),
        },
    };

    const matchingRetailerFulfillment = await mutateAndValidateGraphQLData<FulfillmentCreateV2Mutation>(
        retailerSession.shop,
        retailerSession.accessToken,
        CREATE_FULFILLMENT_FULFILLMENT_ORDER_MUTATION,
        {
            fulfillment: fulfillmentCreateInput,
        },
        'Failed to create fulfillment for retailer on Shopify.',
    );

    const retailerFulfillmentId = matchingRetailerFulfillment.fulfillmentCreateV2?.fulfillment?.id ?? '';
    return retailerFulfillmentId;
}

async function addFulfillmentToDatabase(
    supplierShopifyFulfillmentId: string,
    retailerShopifyFulfillmentId: string,
    dbOrderId: string,
    client: PoolClient,
) {
    const query = `
        INSERT INTO "Fulfillment" (
            "id",
            "supplierShopifyFulfillmentId",
            "retailerShopifyFulfillmentId",
            "orderId"
        )
        VALUES ( $1, $2, $3, $4 )
    `;

    await client.query(query, [uuidv4(), supplierShopifyFulfillmentId, retailerShopifyFulfillmentId, dbOrderId]);
}

// ==============================================================================================================
// END: ADD FULFILLMENT DETAILS HELPER FUNCTIONS
// ==============================================================================================================

async function createRetailerFulfillment(
    supplierShopifyFulfillmentId: string,
    supplierShopifyOrderId: string,
    supplierSession: Session,
    client: PoolClient,
) {
    const [retailerSession, order] = await Promise.all([
        getRetailerSessionFromSupplierOrder(supplierShopifyOrderId, client),
        getOrderFromSupplierShopifyOrderId(supplierShopifyOrderId, client),
    ]);
    const retailerShopifyFulfillmentId = await addRetailerFulfillmentOnShopify(
        supplierShopifyFulfillmentId,
        supplierSession,
        retailerSession,
        supplierShopifyOrderId,
        client,
    );

    await addFulfillmentToDatabase(supplierShopifyFulfillmentId, retailerShopifyFulfillmentId, order.id, client);
}

export default createRetailerFulfillment;
