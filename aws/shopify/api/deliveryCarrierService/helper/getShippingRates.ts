import type { PoolClient } from 'pg';
import { BuyerIdentity, OrderShopifyVariantDetail, ShippingRateRequest } from '../types';
import { CART_CREATE_MUTATION } from '../graphql/storefront/graphql';
import { DeliveryGroupsFragment } from '../types/storefront/storefront.generated';
import { SERVICE_CODE, SHIPPING_RATE } from '../constants';
import { createMapIdToRestObj } from '/opt/nodejs/utils';
import { getAllImportedVariants } from '/opt/nodejs/models/importedVariant';
import { getSessionFromId } from '/opt/nodejs/models/session';
import { composeGid } from '@shopify/admin-graphql-api-utilities';

type ShopifyVariantIdAndQty = {
    shopifyVariantId: string;
    quantity: number;
};

type SubsequentCartCreateIncremental = {
    data: DeliveryGroupsFragment;
};

type SupplierShippingRate = {
    title: string;
    amount: string;
    currencyCode: string;
    description: string;
};

type SupplierShippingRatesMap = Map<string, SupplierShippingRate[]>;

type TotalShippingRateResponse = {
    rates: ShippingRateResponse[];
};

type ShippingRateResponse = {
    service_name: string;
    description: string;
    service_code: string;
    currency: string;
    total_price: string;
};

// ==============================================================================================================
// START: HELPER FUNCTIONS FOR GETTING SHIPPING RATES
// ==============================================================================================================

// function to format buyer's address to calculate shipping rate
function getBuyerIdentity(destination: ShippingRateRequest['rate']['destination']) {
    return {
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
}

async function getOrderDetailsBySupplier(
    retailerId: string,
    orderDetails: OrderShopifyVariantDetail[],
    client: PoolClient,
) {
    const orderDetailsBySupplier = new Map<string, ShopifyVariantIdAndQty[]>(); // session id to array of supplier's shopify variant id
    const allRetailerImportedVariants = await getAllImportedVariants(retailerId, client);
    const supplierDetailsMap = createMapIdToRestObj(allRetailerImportedVariants, 'retailerShopifyVariantId'); // retailerShopifyVariantId => {supplierId, supplierShopifyVariantId}
    orderDetails.forEach((orderDetail) => {
        const { id: retailerShopifyVariantId, quantity } = orderDetail;
        const supplierDetail = supplierDetailsMap.get(retailerShopifyVariantId);

        if (!supplierDetail) {
            // case: not a SynqSell item; the supplier is the retailer's store
            const prevValues = orderDetailsBySupplier.get(retailerId) ?? [];
            orderDetailsBySupplier.set(retailerId, [
                ...prevValues,
                { shopifyVariantId: retailerShopifyVariantId, quantity },
            ]);
        } else {
            // case: the retailer imported this product
            const { supplierId, supplierShopifyVariantId } = supplierDetail;
            const prevValues = orderDetailsBySupplier.get(supplierId) ?? [];
            orderDetailsBySupplier.set(supplierId, [
                ...prevValues,
                { shopifyVariantId: supplierShopifyVariantId, quantity },
            ]);
        }
    });

    return orderDetailsBySupplier;
}

// helper functions for getSupplierShippingRate
function getParsedData(part: string) {
    try {
        const jsonString = part.split('\r\n\r\n')[1].trim();
        const parsedData = JSON.parse(jsonString);
        return parsedData;
    } catch {
        return null;
    }
}

async function getSupplierShippingRate(
    supplierId: string,
    shopifyVariantIdsAndQty: ShopifyVariantIdAndQty[],
    buyerIdentity: BuyerIdentity,
    client: PoolClient,
) {
    const supplierSession = await getSessionFromId(supplierId, client);
    const storefrontAccessToken = supplierSession.storefrontAccessToken;
    if (!storefrontAccessToken) {
        throw new Error('Storefront access token does not exist for supplier session id ' + supplierId);
    }
    const cartCreateInput = {
        lines: shopifyVariantIdsAndQty.map((lineItem) => ({
            merchandiseId: lineItem.shopifyVariantId,
            quantity: lineItem.quantity,
        })),
        ...buyerIdentity,
    };

    // TODO: Figure out how to use meros to decode response instead of doing it manually
    // calculated carrier shipping rates are when the customer reach the checkout screen, and Shopify calculates the exact cost of USPS or any shipping carrier service to charge the customer
    // the CART_CREATE_MUTATION retrieves the calculated shipping rates and static shipping rates
    // however, the only way to get calculated carrier shipping rates from Shopify is by using multipart responses, where data is streamed into chunks
    // https://github.com/graphql/graphql-over-http/blob/c1acb54053679f08939c9cdcee00b72d77c42211/rfcs/IncrementalDelivery.md
    // I tried using meros to decode it, but even though the "Content-Type: multipart/mixed; boundary=graphql", calling meros does not split it into parts

    const url = `https://${supplierSession.shop}/api/2024-07/graphql.json`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
        },
        body: JSON.stringify({
            query: CART_CREATE_MUTATION,
            variables: {
                input: cartCreateInput,
            },
        }),
    });

    let result = '';
    if (!response.body) {
        throw new Error('Creating a cart does not have a response body.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
    }

    const parts = result.split('--graphql');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedDataArr: any[] = [];
    const supplierShippingRate: SupplierShippingRate[] = [];
    parts.forEach((part) => {
        const parsedData = getParsedData(part);
        if (parsedData) {
            parsedDataArr.push(parsedData);
        }
    });

    parsedDataArr.forEach((dataItem) => {
        // case: initial streamed data response
        // context: there's only two ways two main ways to implement shipping: create a mock cart and get the shipping rate or import shipping profiles
        // aps like printify use shipping profiles but the disadvantage is that bloats the user's store and there's max 100 shipping profiles
        // mock cart has the disadvantage that the item has to have at least one stock, but it shouldn't matter because the supplier's order is not created until after the delivery carrier service api is called
        const userErrors = dataItem?.data?.cartCreate?.userErrors;
        if (userErrors && userErrors.length > 0) {
            throw new Error(userErrors);
        } else if (dataItem.incremental?.[0]?.data?.deliveryGroups?.edges) {
            dataItem.incremental.forEach((incremental: SubsequentCartCreateIncremental) => {
                const deliveryGroups = incremental.data.deliveryGroups.edges;
                deliveryGroups.forEach(({ node }) => {
                    const deliveryOptions = node.deliveryOptions;
                    deliveryOptions.forEach((option) => {
                        const {
                            title,
                            estimatedCost: { amount, currencyCode },
                            description,
                        } = option;
                        supplierShippingRate.push({
                            title: title ?? '',
                            amount: amount,
                            currencyCode: currencyCode,
                            description: description ?? '',
                        });
                    });
                });
            });
        }
    });

    return supplierShippingRate;
}

// helper functions for calculateTotalShippingRates
// for when the supplier/retailer is international shipping, while the other is domestic shipping
function getCustomShippingRates(allShippingRates: SupplierShippingRate[]) {
    const totalShippingRates: TotalShippingRateResponse = allShippingRates.reduce(
        (acc, shippingRate) => {
            const currCustomRate = acc.rates[0];
            const { amount, currencyCode, title } = shippingRate;

            if (currCustomRate && (title === SHIPPING_RATE.ECONOMY || title === SHIPPING_RATE.INTERNATIONAL)) {
                acc.rates[0] = {
                    ...currCustomRate,
                    total_price: (parseFloat(currCustomRate.total_price) + parseFloat(amount)).toString(),
                };
            } else if (title === SHIPPING_RATE.ECONOMY || title === SHIPPING_RATE.INTERNATIONAL) {
                acc.rates.push({
                    service_name: SHIPPING_RATE.CUSTOM,
                    description: 'Includes tracking',
                    service_code: SERVICE_CODE.CUSTOM,
                    currency: currencyCode,
                    total_price: amount,
                });
            }
            return acc;
        },
        {
            rates: [] as ShippingRateResponse[],
        },
    );
    return totalShippingRates;
}

function getDomesticShippingRates(allShippingRates: SupplierShippingRate[]) {
    const totalShippingRates: TotalShippingRateResponse = allShippingRates.reduce(
        (acc, shippingRate) => {
            const { amount, currencyCode, title, description } = shippingRate;
            const currCustomRateIndex = acc.rates.findIndex(({ service_name }) => service_name === title);

            if (currCustomRateIndex !== -1) {
                const currCustomRate = acc.rates[currCustomRateIndex];
                acc.rates[currCustomRateIndex] = {
                    ...currCustomRate,
                    total_price: (parseFloat(currCustomRate.total_price) + parseFloat(amount)).toString(),
                };
            } else {
                const serviceCode = title === SHIPPING_RATE.ECONOMY ? SERVICE_CODE.STANDARD : SERVICE_CODE.EXPEDITED;
                acc.rates.push({
                    service_name: title,
                    description: description,
                    service_code: serviceCode,
                    currency: currencyCode,
                    total_price: amount,
                });
            }
            return acc;
        },
        {
            rates: [] as ShippingRateResponse[],
        },
    );
    return totalShippingRates;
}

function getInternationalShippingRates(allShippingRates: SupplierShippingRate[]) {
    const totalShippingRates: TotalShippingRateResponse = allShippingRates.reduce(
        (acc, shippingRate) => {
            const currCustomRate = acc.rates[0];
            const { amount, currencyCode, description } = shippingRate;

            if (currCustomRate) {
                acc.rates[0] = {
                    ...currCustomRate,
                    total_price: (parseFloat(currCustomRate.total_price) + parseFloat(amount)).toString(),
                };
            } else {
                acc.rates.push({
                    service_name: SHIPPING_RATE.INTERNATIONAL,
                    description: description,
                    service_code: SERVICE_CODE.ECONOMY_INTERNATIONAL,
                    currency: currencyCode,
                    total_price: amount,
                });
            }
            return acc;
        },
        {
            rates: [] as ShippingRateResponse[],
        },
    );
    return totalShippingRates;
}

// TODO: Change implementation once see how other merchants in the real world setup their international profiles
// By default, shopify has "Economy" and "Standard" set up for every merchant for domestic shipping (names cannot be changed)
// while for international shipping, you can either use Calculated Carrier Cost or set a shipping rate manually
// However, the name for the default shipping rate for international is custom and can be changed to any name (e.g. International, International Shipping, Worldwide)
// For now, the implementation is as follows:
// If it's not the default name "International Shipping", then it will immediately fail
// otherwise, all shipping costs will be summed for that name and return it
function calculateTotalShippingRates(shippingRatesBySupplier: SupplierShippingRatesMap) {
    const allShippingRates = Array.from(shippingRatesBySupplier.values()).flatMap((rates) => rates);
    const hasEconomyOrStandard =
        allShippingRates.filter(({ title }) => title === SHIPPING_RATE.ECONOMY || title === SHIPPING_RATE.STANDARD)
            .length > 0;
    const hasInternational = allShippingRates.filter(({ title }) => title === SHIPPING_RATE.INTERNATIONAL).length > 0;
    const isMultiCurrency = new Set(allShippingRates.map(({ currencyCode }) => currencyCode)).size > 1;

    if (!hasEconomyOrStandard && !hasInternational) {
        throw new Error('There are no international or domestic shipping rates SynqSell can handle.');
    }

    if (isMultiCurrency) {
        throw new Error("SynqSell does not handle shipping for shops that don't opt into multi-currency.");
    }

    // if a retailer imports a product from a supplier from a different country
    // for a customer who buys the product, it's possible that the supplier's rate is international and retailer's rate is standard
    // if that happens, then we just create a custom shipping rate with Economy + International Shipping to display to the user, until we get more user feedback
    if (hasEconomyOrStandard && hasInternational) {
        return getCustomShippingRates(allShippingRates);
    } else if (hasEconomyOrStandard) {
        return getDomesticShippingRates(allShippingRates);
    } else {
        return getInternationalShippingRates(allShippingRates);
    }
}

// ==============================================================================================================
// END: HELPER FUNCTIONS FOR GETTING SHIPPING RATES
// ==============================================================================================================
// Shopify relies on delivery carrier service
async function getShippingRates(retailerId: string, request: ShippingRateRequest, client: PoolClient) {
    const orderDetails = request.rate.items.map(({ variant_id, quantity }) => ({
        id: composeGid('ProductVariant', variant_id),
        quantity,
    }));
    const destination = request.rate.destination;
    const buyerIdentity: BuyerIdentity = getBuyerIdentity(destination);
    const orderDetailsBySupplier = await getOrderDetailsBySupplier(retailerId, orderDetails, client);
    const supplierSessionIds = Array.from(orderDetailsBySupplier.keys());
    const shippingRatesBySupplier: SupplierShippingRatesMap = new Map();

    // this calculates the shipping rates for each supplier
    await Promise.all(
        supplierSessionIds.map(async (supplierId) => {
            const shopifyVariantIdsAndQty = orderDetailsBySupplier.get(supplierId) ?? []; // this should not null-coalesce, only for ts
            const supplierShippingRate = await getSupplierShippingRate(
                supplierId,
                shopifyVariantIdsAndQty,
                buyerIdentity,
                client,
            );
            shippingRatesBySupplier.set(supplierId, supplierShippingRate);
        }),
    );

    const totalShippingRate = calculateTotalShippingRates(shippingRatesBySupplier);
    return totalShippingRate;
}

export default getShippingRates;
