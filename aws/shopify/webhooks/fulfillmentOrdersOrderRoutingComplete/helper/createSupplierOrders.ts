import { PoolClient } from 'pg';
import { CustomerShippingDetails, FulfillmentOrdersBySupplier, Session, ShippingRateResponse } from '../types';
import { fetchAndValidateGraphQLData, mutateAndValidateGraphQLData } from '../util';
import {
    DRAFT_ORDER_COMPLETE_MUTATION,
    DRAFT_ORDER_CREATE_MUTATION,
    GET_CARRIER_SERVICE_CALLBACK_URL,
    GET_FULFILLMENT_ORDER_CUSTOMER_DETAILS,
    GET_INITIAL_ORDER_DETAILS_DATABASE,
    GET_SUBSEQUENT_ORDER_DETAILS_DATABASE,
} from '../graphql';
import {
    CarrierServiceCallbackUrlQuery,
    DraftOrderCompleteMutation,
    DraftOrderCreateMutation,
    FulfillmentOrderCustomerDetailsQuery,
    InitialOrderDetailsQuery,
    SubsequentOrderDetailsQuery,
} from '../types/admin.generated';
import { ORDER_PAYMENT_STATUS, SERVICE_CODE, ServiceCodeProps } from '../constants';
import { CurrencyCode } from '../types/admin.types';
import { getRetailerToSupplierVariantIdMap, getSession } from './util';
import createMapIdToRestObj from '../util/createMapToRestObj';
import { v4 as uuidv4 } from 'uuid';
import { parseGid } from '@shopify/admin-graphql-api-utilities';

type OrderDetailForDatabase = {
    shopifyOrderId: string;
    currency: CurrencyCode | null;
    shippingCost: number;
    lineItems: {
        shopifyLineItemId: string;
        shopifyVariantId: string | null;
        quantity: number;
    }[];
};

type AddOrderLineToDatabase = {
    retailerShopifyVariantId: string;
    supplierShopifyVariantId: string;
    retailPricePerUnit: number;
    retailerProfitPerUnit: number;
    supplierProfitPerUnit: number;
    retailerShopifyOrderLineItemId: string;
    supplierShopifyOrderLineItemId: string;
    quantity: number;
    orderId: string;
    priceListId: string;
};

type PriceDetail = {
    retailPrice: string;
    retailerPayment: string;
    supplierProfit: string;
};

type ShippingRate = {
    priceWithCurrency: {
        amount: number;
        currencyCode: string;
    };
    title: string;
};

// ==============================================================================================================
// START: ADD EQUIVALENT ORDER FROM FULFILLMENT ORDER ON SUPPLIER'S SHOPIFY STORE LOGIC
// ==============================================================================================================
async function getShopifyCarrierServiceId(sessionId: string, client: PoolClient) {
    try {
        const query = `
            SELECT "shopifyCarrierServiceId" FROM "CarrierService"
            WHERE "retailerId" = $1
        `;
        const res = await client.query(query, [sessionId]);
        if (res.rows.length === 0) {
            throw new Error(`No shopify carrier service exists for sessionId ${sessionId}.`);
        }
        return res.rows[0].shopifyCarrierServiceId as string;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to get Shopify carrier service id from sessionId ${sessionId}.`);
    }
}

async function getCarrierServiceCallbackUrl(session: Session, shopifyCarrierServiceId: string) {
    const res = await fetchAndValidateGraphQLData<CarrierServiceCallbackUrlQuery>(
        session.shop,
        session.accessToken,
        GET_CARRIER_SERVICE_CALLBACK_URL,
        {
            id: shopifyCarrierServiceId,
        },
    );
    const callbackUrl = res.carrierService?.callbackUrl;
    if (!callbackUrl) {
        throw new Error(
            `Callback url does not exist for sessionId ${session.id} and shopifyCarrierServiceId ${shopifyCarrierServiceId}.`,
        );
    }
    return callbackUrl as string;
}

async function getAllShippingRates(
    fulfillmentOrder: FulfillmentOrdersBySupplier,
    customerShippingDetails: CustomerShippingDetails,
    carrierServiceCallbackUrl: string,
) {
    // calls the delivery carrier service public endpoint to get all the shipping rates that are possible for a supplier in this order
    const requestBody = {
        rate: {
            destination: {
                country: customerShippingDetails.countryCode,
                postal_code: customerShippingDetails.zip,
                province: customerShippingDetails.province,
                city: customerShippingDetails.city,
                name: 'Customer',
                address1: customerShippingDetails.address1,
                address2: customerShippingDetails.address2,
                address3: null,
                phone: null,
                fax: null,
                email: null,
                address_type: null,
                company_name: null,
            },
            items: fulfillmentOrder.orderLineItems.map((lineItem) => ({
                quantity: lineItem.quantity,
                variant_id: parseGid(lineItem.shopifyVariantId),
            })),
        },
    };
    // TODO: implement retry logic
    const response = await fetch(carrierServiceCallbackUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        throw new Error(
            `Failed to get all shipping rates for fulfillment order id ${fulfillmentOrder.fulfillmentOrderId}.`,
        );
    }
    const data: ShippingRateResponse = await response.json();
    return data;
}

// end helper functions for getSupplierShippingRate
async function getSupplierShippingRate(
    fulfillmentOrder: FulfillmentOrdersBySupplier,
    serviceCode: ServiceCodeProps,
    customerShippingDetails: CustomerShippingDetails,
    retailerSession: Session,
    client: PoolClient,
) {
    try {
        const shopifyCarrierServiceId = await getShopifyCarrierServiceId(retailerSession.id, client);
        const carrierServiceCallbackUrl = await getCarrierServiceCallbackUrl(retailerSession, shopifyCarrierServiceId);
        const shippingRates = await getAllShippingRates(
            fulfillmentOrder,
            customerShippingDetails,
            carrierServiceCallbackUrl,
        );
        // please reference deliveryCarrierService lambda function for more details on the impl,
        // but the fulfillment order's service code is what shipping method the customer chose
        // custom = international shipping or standard_shipping (supplier and retailer can be in different countries)
        // international_shipping = international_shipping, expedited_mail = expedited mail
        const shippingRateOfInterest = shippingRates.rates.filter((shippingRate) => {
            if (serviceCode === SERVICE_CODE.CUSTOM) {
                return shippingRate.service_code === SERVICE_CODE.STANDARD || SERVICE_CODE.ECONOMY_INTERNATIONAL;
            } else {
                return shippingRate.service_code === serviceCode;
            }
        });
        const shippingRate: ShippingRate = {
            priceWithCurrency: {
                amount: parseFloat(shippingRateOfInterest?.[0]?.total_price ?? '0'),
                currencyCode: shippingRateOfInterest?.[0]?.currency ?? 'USD',
            },
            title: shippingRateOfInterest?.[0]?.service_name ?? 'Standard',
        };
        return shippingRate;
    } catch (error) {
        console.error(error);
        throw new Error(
            `Failed to get supplier shipping rate for retailerId ${retailerSession.id} and fulfillmentOrderId ${fulfillmentOrder.fulfillmentOrderId}.`,
        );
    }
}

// ==============================================================================================================
// START: ADD EQUIVALENT ORDER FROM FULFILLMENT ORDER ON SUPPLIER'S SHOPIFY STORE LOGIC
// ==============================================================================================================
async function getCustomerShippingDetails(fulfillmentOrderId: string, retailerSession: Session) {
    const fulfillmentOrderQuery = await fetchAndValidateGraphQLData<FulfillmentOrderCustomerDetailsQuery>(
        retailerSession.shop,
        retailerSession.accessToken,
        GET_FULFILLMENT_ORDER_CUSTOMER_DETAILS,
        {
            id: fulfillmentOrderId,
        },
    );
    const customerShippingDetails = fulfillmentOrderQuery.fulfillmentOrder?.destination;
    if (!customerShippingDetails) {
        throw new Error('There was no data inside the customer shipping details');
    }
    return customerShippingDetails;
}

async function createDraftOrder(
    fulfillmentOrder: FulfillmentOrdersBySupplier,
    customerShippingDetails: CustomerShippingDetails,
    supplierShippingRate: ShippingRate,
    supplierSession: Session,
    client: PoolClient,
) {
    const { orderLineItems } = fulfillmentOrder;
    const { email, province: provinceCode, ...restOfCustomerShippingDetails } = customerShippingDetails;
    const retailerVariantIds = fulfillmentOrder.orderLineItems.map((lineItem) => lineItem.shopifyVariantId);
    const retailerToSupplierVariantIdMap = await getRetailerToSupplierVariantIdMap(retailerVariantIds, client);
    const draftOrdersInput = {
        email,
        lineItems: orderLineItems.map((lineItem) => ({
            variantId: retailerToSupplierVariantIdMap.get(lineItem.shopifyVariantId)?.supplierShopifyVariantId,
            quantity: lineItem.quantity,
        })),
        shippingLine: {
            ...supplierShippingRate,
        },
        shippingAddress: {
            ...restOfCustomerShippingDetails,
            provinceCode,
        },
        tags: 'SynqSell',
    };

    const newDraftOrder = await mutateAndValidateGraphQLData<DraftOrderCreateMutation>(
        supplierSession.shop,
        supplierSession.accessToken,
        DRAFT_ORDER_CREATE_MUTATION,
        {
            input: draftOrdersInput,
        },
        'Failed to create draft order',
    );

    const newDraftOrderId = newDraftOrder.draftOrderCreate?.draftOrder?.id;
    if (!newDraftOrderId) {
        throw new Error('No draft order was created.');
    }
    return newDraftOrderId;
}

async function completeDraftOrder(draftOrderId: string, supplierSession: Session) {
    const newOrder = await mutateAndValidateGraphQLData<DraftOrderCompleteMutation>(
        supplierSession.shop,
        supplierSession.accessToken,
        DRAFT_ORDER_COMPLETE_MUTATION,
        {
            id: draftOrderId,
        },
        'Failed to create order from draft order',
    );
    const shopifyOrderId = newOrder.draftOrderComplete?.draftOrder?.order?.id;
    if (!shopifyOrderId) {
        throw new Error('No new order was created from draft order.');
    }
    console.log(`Supplier order ${shopifyOrderId} was created`);
    return shopifyOrderId;
}

// ==============================================================================================================
// START: ADD ORDERS TO DATABASE LOGIC
// ==============================================================================================================
async function getOrderDetails(shopifyOrderId: string, session: Session) {
    let hasMore = true;
    let endCursor = null;

    const initialOrderDetails = await fetchAndValidateGraphQLData<InitialOrderDetailsQuery>(
        session.shop,
        session.accessToken,
        GET_INITIAL_ORDER_DETAILS_DATABASE,
        {
            id: shopifyOrderId,
        },
    );

    const orderDetails = initialOrderDetails.order;
    const orderDetailsForDatabase: OrderDetailForDatabase = {
        shopifyOrderId: shopifyOrderId,
        currency: orderDetails?.presentmentCurrencyCode ?? null,
        shippingCost: orderDetails?.shippingLine?.originalPriceSet.presentmentMoney.amount ?? 0,
        lineItems:
            orderDetails?.lineItems.edges.map(({ node }) => ({
                shopifyLineItemId: node.id,
                shopifyVariantId: node.variant?.id ?? null, // this will not be null, just graphql semantics
                quantity: node.quantity,
            })) ?? [],
    };

    hasMore = initialOrderDetails.order?.lineItems.pageInfo.hasNextPage ?? false;
    endCursor = initialOrderDetails.order?.lineItems.pageInfo.endCursor ?? null;
    while (hasMore && endCursor) {
        const subsequentOrderLineItemDetails: SubsequentOrderDetailsQuery =
            await fetchAndValidateGraphQLData<SubsequentOrderDetailsQuery>(
                session.shop,
                session.accessToken,
                GET_SUBSEQUENT_ORDER_DETAILS_DATABASE,
                {
                    id: shopifyOrderId,
                    after: endCursor,
                },
            );

        const prevLineItems = orderDetailsForDatabase?.lineItems;
        const newLineItems =
            subsequentOrderLineItemDetails.order?.lineItems.edges.map(({ node }) => ({
                shopifyLineItemId: node.id,
                shopifyVariantId: node.variant?.id ?? null, // this will not be null, just graphql semantics
                quantity: node.quantity,
            })) ?? [];
        const lineItems = [...prevLineItems, ...newLineItems];
        orderDetailsForDatabase.lineItems = lineItems;
        hasMore = subsequentOrderLineItemDetails.order?.lineItems.pageInfo.hasNextPage ?? false;
        endCursor = subsequentOrderLineItemDetails.order?.lineItems.pageInfo.endCursor ?? null;
    }

    return orderDetailsForDatabase;
}

async function addOrderToDatabase(
    retailerShopifyFulfillmentOrderId: string,
    supplierShopifyOrderId: string,
    supplierShippingRate: ShippingRate,
    retailerSessionId: string,
    supplierSessionId: string,
    client: PoolClient,
) {
    try {
        const query = `
            INSERT INTO 
            "Order" ("id", "currency", "retailerShopifyFulfillmentOrderId", "supplierShopifyOrderId", "retailerId", "supplierId", "shippingCost", "paymentStatus", "updatedAt")
            VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `;
        // TODO: Figure out how to deal with matching currencies (maybe use https://www.npmjs.com/package/currency-converter-lt)
        // Current implementation is customers are allowed to import items only if they're from same country
        const newOrder = await client.query(query, [
            uuidv4(),
            supplierShippingRate.priceWithCurrency.currencyCode,
            retailerShopifyFulfillmentOrderId,
            supplierShopifyOrderId,
            retailerSessionId,
            supplierSessionId,
            supplierShippingRate.priceWithCurrency.amount,
            ORDER_PAYMENT_STATUS.INCOMPLETE,
            new Date(),
        ]);
        const newDbOrderId: string = newOrder.rows[0].id;
        return newDbOrderId;
    } catch (error) {
        console.error(error);
        throw new Error('Failed to add order to database.');
    }
}

async function addOrderLineToDatabase(props: AddOrderLineToDatabase, client: PoolClient) {
    try {
        const orderLineItemQuery = `
            INSERT INTO "OrderLineItem" (
                "id",
                "retailerShopifyVariantId",
                "supplierShopifyVariantId",
                "retailPricePerUnit",
                "retailerProfitPerUnit",
                "supplierProfitPerUnit",
                "retailerShopifyOrderLineItemId",
                "supplierShopifyOrderLineItemId",
                "quantity",
                "orderId",
                "priceListId"
            )
            VALUES (
                $1,  -- id
                $2,  -- retailerShopifyVariantId
                $3,  -- supplierShopifyVariantId
                $4,  -- retailPricePerUnit
                $5,  -- retailerProfitPerUnit
                $6,  -- supplierProfitPerUnit
                $7,  -- retailerShopifyOrderLineItemId
                $8,  -- supplierShopifyOrderLineItemId
                $9,  -- quantity
                $10, -- orderId
                $11  -- priceListId
            )
        `;
        const {
            retailerShopifyVariantId,
            supplierShopifyVariantId,
            retailPricePerUnit,
            retailerProfitPerUnit,
            supplierProfitPerUnit,
            retailerShopifyOrderLineItemId,
            supplierShopifyOrderLineItemId,
            quantity,
            orderId,
            priceListId,
        } = props;

        await client.query(orderLineItemQuery, [
            uuidv4(),
            retailerShopifyVariantId,
            supplierShopifyVariantId,
            retailPricePerUnit,
            retailerProfitPerUnit,
            supplierProfitPerUnit,
            retailerShopifyOrderLineItemId,
            supplierShopifyOrderLineItemId,
            quantity,
            orderId,
            priceListId,
        ]);
    } catch (error) {
        console.error(error);
        throw new Error('Failed to add order line to database.');
    }
}

async function addAllOrderLineItemsToDatabase(
    retailerOrderLineItems: FulfillmentOrdersBySupplier['orderLineItems'],
    supplierOrderLineItems: OrderDetailForDatabase['lineItems'],
    newDbOrderId: string,
    client: PoolClient,
) {
    try {
        const retailerVariantIds = retailerOrderLineItems.map((lineItem) => lineItem.shopifyVariantId);
        const retailerToSupplierVariantIdsMap = await getRetailerToSupplierVariantIdMap(retailerVariantIds, client);
        const supplierOrderLineItemsMap = createMapIdToRestObj(supplierOrderLineItems, 'shopifyVariantId'); // key is supplier variant id

        const createOrderLineItemPromises = retailerOrderLineItems.map(async (retailerLineItem) => {
            const retailerShopifyVariantId = retailerLineItem.shopifyVariantId;
            const supplierShopifyVariantId =
                retailerToSupplierVariantIdsMap.get(retailerShopifyVariantId)?.supplierShopifyVariantId;
            if (!supplierShopifyVariantId) {
                throw new Error(
                    `Retailer shopify variant id ${retailerShopifyVariantId} does not match any supplier variant id.`,
                );
            }
            const supplierOrderLineItemDetails = supplierOrderLineItemsMap.get(supplierShopifyVariantId);
            if (!supplierOrderLineItemDetails) {
                throw new Error(`Order line does not exist for supplier shopify variant ${supplierShopifyVariantId}`);
            }
            const prices = await getVariantPriceDetails(supplierShopifyVariantId, retailerLineItem.priceListId, client);

            return addOrderLineToDatabase(
                {
                    retailerShopifyVariantId,
                    supplierShopifyVariantId,
                    retailPricePerUnit: parseFloat(prices.retailPrice),
                    retailerProfitPerUnit: parseFloat(prices.retailerPayment),
                    supplierProfitPerUnit: parseFloat(prices.supplierProfit),
                    retailerShopifyOrderLineItemId: retailerLineItem.shopifyLineItemId,
                    supplierShopifyOrderLineItemId: supplierOrderLineItemDetails.shopifyLineItemId,
                    quantity: retailerLineItem.quantity,
                    orderId: newDbOrderId,
                    priceListId: retailerLineItem.priceListId,
                },
                client,
            );
        });

        await Promise.all(createOrderLineItemPromises);
    } catch (error) {
        console.error(error);
        throw new Error('Failed to all order line items to database.');
    }
}

async function getVariantPriceDetails(supplierShopifyVariantId: string, priceListId: string, client: PoolClient) {
    try {
        const query = `
            SELECT 
                "Variant"."retailPrice",
                "Variant"."retailerPayment",
                "Variant"."supplierProfit"
            FROM "Variant"
            INNER JOIN "Product" ON "Product"."id" = "Variant"."productId"
            WHERE
                "Product"."priceListId" = $1 AND
                "Variant"."shopifyVariantId" = $2
            LIMIT 1
        `;
        const queryRes = await client.query(query, [priceListId, supplierShopifyVariantId]);
        if (queryRes.rows.length === 0) {
            throw new Error(
                `Could not get retail price and profit from variant id ${supplierShopifyVariantId} and price list ${priceListId}.`,
            );
        }
        return queryRes.rows[0] as PriceDetail;
    } catch {
        throw new Error(
            `Failed to get retail price and profit from supplier variant id ${supplierShopifyVariantId} and price list id ${priceListId}`,
        );
    }
}

async function addEntireOrderToDatabase(
    fulfillmentOrder: FulfillmentOrdersBySupplier,
    supplierOrderDetails: OrderDetailForDatabase,
    supplierShippingRate: ShippingRate,
    retailerId: string,
    supplierId: string,
    client: PoolClient,
) {
    const newDbOrderId = await addOrderToDatabase(
        fulfillmentOrder.fulfillmentOrderId,
        supplierOrderDetails.shopifyOrderId,
        supplierShippingRate,
        retailerId,
        supplierId,
        client,
    );
    await addAllOrderLineItemsToDatabase(
        fulfillmentOrder.orderLineItems,
        supplierOrderDetails.lineItems,
        newDbOrderId,
        client,
    );
}
// ==============================================================================================================
// END: ADD ORDERS TO DATABASE LOGIC
// ==============================================================================================================

async function createSupplierOrder(
    fulfillmentOrder: FulfillmentOrdersBySupplier,
    retailerSession: Session,
    customerShippingDetails: CustomerShippingDetails,
    serviceCode: ServiceCodeProps,
    client: PoolClient,
) {
    const supplierSession = await getSession(fulfillmentOrder.supplierId, client);
    const supplierShippingRate = await getSupplierShippingRate(
        fulfillmentOrder,
        serviceCode,
        customerShippingDetails,
        retailerSession,
        client,
    );
    // related to querying and mutating supplier's shopify store
    const draftOrderId = await createDraftOrder(
        fulfillmentOrder,
        customerShippingDetails,
        supplierShippingRate,
        supplierSession,
        client,
    );
    const supplierShopifyOrderId = await completeDraftOrder(draftOrderId, supplierSession);
    const supplierOrderDetails = await getOrderDetails(supplierShopifyOrderId, supplierSession);
    // related to adding created order to database
    await addEntireOrderToDatabase(
        fulfillmentOrder,
        supplierOrderDetails,
        supplierShippingRate,
        retailerSession.id,
        supplierSession.id,
        client,
    );
}

async function createSupplierOrders(
    fulfillmentOrdersBySupplier: FulfillmentOrdersBySupplier[],
    shopifyFulfillmentOrderId: string,
    serviceCode: ServiceCodeProps,
    retailerSession: Session,
    client: PoolClient,
) {
    const customerShippingDetails = await getCustomerShippingDetails(shopifyFulfillmentOrderId, retailerSession);
    const createNewOrdersPromises = fulfillmentOrdersBySupplier.map((order) => {
        return createSupplierOrder(order, retailerSession, customerShippingDetails, serviceCode, client);
    });

    await Promise.all(createNewOrdersPromises);
}

export default createSupplierOrders;
