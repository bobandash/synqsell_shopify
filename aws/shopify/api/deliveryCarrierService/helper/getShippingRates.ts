import type { PoolClient } from 'pg';
import { createMapToRestObj } from '../util';
import { BuyerIdentityInput, OrderShopifyVariantDetail, Session } from '../types';
import { CART_CREATE_MUTATION } from '../graphql/storefront/graphql';
import { DeliveryGroupsFragment } from '../types/storefront/storefront.generated';
import { SERVICE_CODE, SHIPPING_RATE } from '../constants';

type ImportedVariantDetail = {
    retailerShopifyVariantId: string;
    supplierShopifyVariantId: string;
    supplierId: string;
};

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
async function getAllImportedVariants(retailerId: string, client: PoolClient): Promise<ImportedVariantDetail[]> {
    try {
        const query = `
          SELECT 
            "ImportedVariant"."shopifyVariantId" as "retailerShopifyVariantId",
            "Variant"."shopifyVariantId" as "supplierShopifyVariantId",
            "PriceList"."supplierId" as "supplierId"
          FROM "ImportedVariant"
          INNER JOIN "ImportedProduct" ON "ImportedProduct"."id" = "ImportedVariant"."importedProductId"
          INNER JOIN "Product" ON "Product"."id" = "ImportedProduct"."prismaProductId"
          INNER JOIN "PriceList" ON "PriceList"."id" = "Product"."priceListId"
          INNER JOIN "Variant" ON "Variant"."id" = "ImportedVariant"."prismaVariantId"
          WHERE "ImportedProduct"."retailerId" = $1    
        `;
        const res = await client.query(query, [retailerId]);
        return res.rows as ImportedVariantDetail[];
    } catch {
        throw new Error(`Failed to get all imported variants the retailer ${retailerId} has.`);
    }
}

async function getShopifyVariantIdsAndQtyBySupplier(
    retailerId: string,
    orderShopifyVariantDetails: OrderShopifyVariantDetail[],
    client: PoolClient,
) {
    const shopifyVariantIdsAndQtyBySupplier = new Map<string, ShopifyVariantIdAndQty[]>(); // creates a map of supplier session id to array to supplier's shopify variant id
    const allRetailerImportedVariants = await getAllImportedVariants(retailerId, client);
    const supplierDetailsMap = createMapToRestObj(allRetailerImportedVariants, 'retailerShopifyVariantId'); // retailerShopifyVariantId => {supplierId, supplierShopifyVariantId}
    orderShopifyVariantDetails.forEach((orderShopifyVariantDetail) => {
        const { id: retailerShopifyVariantId, quantity } = orderShopifyVariantDetail;
        const supplierDetail = supplierDetailsMap.get(retailerShopifyVariantId);

        if (!supplierDetail) {
            // case: the supplier for the product was the retailer
            const prevValues = shopifyVariantIdsAndQtyBySupplier.get(retailerId) ?? [];
            shopifyVariantIdsAndQtyBySupplier.set(retailerId, [
                ...prevValues,
                { shopifyVariantId: retailerShopifyVariantId, quantity },
            ]);
        } else {
            // case: the retailer imported this product
            const { supplierId, supplierShopifyVariantId } = supplierDetail;
            const prevValues = shopifyVariantIdsAndQtyBySupplier.get(supplierId) ?? [];
            shopifyVariantIdsAndQtyBySupplier.set(supplierId, [
                ...prevValues,
                { shopifyVariantId: supplierShopifyVariantId, quantity },
            ]);
        }
    });

    return shopifyVariantIdsAndQtyBySupplier;
}

// helper functions for getSupplierShippingRate
async function getSession(sessionId: string, client: PoolClient) {
    try {
        const query = `SELECT * FROM "Session" WHERE "id" = $1`;
        const res = await client.query(query, [sessionId]);
        const session = res.rows[0] as Session;
        if (!session) {
            throw new Error(`Session is not found for sessionId ${sessionId}.`);
        }
        return session;
    } catch (error) {
        throw new Error('Failed to get session ' + sessionId);
    }
}

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
    supplierSessionId: string,
    shopifyVariantIdsAndQty: ShopifyVariantIdAndQty[],
    buyerIdentityInput: BuyerIdentityInput,
    client: PoolClient,
) {
    const supplierSession = await getSession(supplierSessionId, client);
    const storefrontAccessToken = supplierSession.storefrontAccessToken;
    if (!storefrontAccessToken) {
        throw new Error('Storefront access token does not exist for supplier session id ' + supplierSessionId);
    }

    const cartCreateInput = {
        lines: shopifyVariantIdsAndQty.map((lineItem) => ({
            merchandiseId: lineItem.shopifyVariantId,
            quantity: lineItem.quantity,
        })),
        ...buyerIdentityInput,
    };

    // calculated carrier shipping rates are when the customer reach the checkout screen, and Shopify calculates the exact cost of USPS or any shipping carrier service to charge the customer
    // the CART_CREATE_MUTATION retrieves the calculated shipping rates and static shipping rates
    // however, the only way to get calculated carrier shipping rates from Shopify is by using multipart responses, where data is streamed into chunks
    // https://github.com/graphql/graphql-over-http/blob/c1acb54053679f08939c9cdcee00b72d77c42211/rfcs/IncrementalDelivery.md
    // I tried using meros to decode it, but even though the "Content-Type: multipart/mixed; boundary=graphql", calling meros does not split it into parts
    // TODO: Figure out how to use meros to decode response instead of doing it manually

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
        // !!! TODO: Fix the bug below, this is a severe edge case that breaks the flow of the app but requires a lot of research for a potential solution
        // there's only two ways two main ways to implement shipping: create a mock cart and get the shipping rate or import shipping profiles
        // aps like printify use shipping profiles but the disadvantage is that bloats the user's store and there's max 100 shipping profiles
        // mock cart has the disadvantage that the item has to have at least one stock... meaning if a customer orders an item and the stock is 0, the order will not be created on the supplier's store...         
        const userErrors = dataItem?.data?.cartCreate?.userErrors;
        if (userErrors) {
            throw new Error(userErrors);
        }
        // case: subsequent data streams
        else if (dataItem.incremental?.[0]?.data?.deliveryGroups?.edges) {
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

// I don't know how other merchants set up their delivery profiles
// By default, shopify has "Economy" and "Standard" set up for every merchant for domestic shipping (names cannot be changed)
// while for international shipping, you can either use Calculated Carrier Cost or set a shipping rate manually
// However, the name for the default shipping rate for international is custom and can be changed to any name (e.g. International, International Shipping, Worldwide)
// For now, my implementation will be like this:
// I'll use the default unchanged name "International Shipping" and sum up all the shipping costs for that name and return it, but I need to see how merchants in the real world setup their international profiles
function calculateTotalShippingRates(shippingRatesBySupplier: SupplierShippingRatesMap) {
    const allShippingRates = Array.from(shippingRatesBySupplier.values()).flatMap((rates) => rates);
    const hasEconomyOrStandard =
        allShippingRates.filter(({ title }) => title === SHIPPING_RATE.ECONOMY || title === SHIPPING_RATE.STANDARD)
            .length > 0;
    const hasInternational = allShippingRates.filter(({ title }) => title === SHIPPING_RATE.INTERNATIONAL).length > 0;
    // TODO: I believe that setting up multi-currency is adopted in most stores, so the currency should be the same (presentment currency in customer's local currency), but should verify
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
async function getShippingRates(
    retailerSessionId: string,
    orderShopifyVariantDetails: OrderShopifyVariantDetail[],
    buyerIdentityInput: BuyerIdentityInput,
    client: PoolClient,
) {
    // get the delivery profiles and sum the values
    // I need to think about how to restrict retailers to have access to the carrier service api, this should be from the app, so it's ok
    const shopifyVariantIdsAndQtyBySupplier = await getShopifyVariantIdsAndQtyBySupplier(
        retailerSessionId,
        orderShopifyVariantDetails,
        client,
    );

    const supplierSessionIds = Array.from(shopifyVariantIdsAndQtyBySupplier.keys());
    const shippingRatesBySupplier: SupplierShippingRatesMap = new Map();

    // this calculates the shipping rates for each supplier
    await Promise.all(
        supplierSessionIds.map(async (sessionId) => {
            const shopifyVariantIdsAndQty = shopifyVariantIdsAndQtyBySupplier.get(sessionId) ?? []; // this should not null-coalesce, only for ts
            const supplierShippingRate = await getSupplierShippingRate(
                sessionId,
                shopifyVariantIdsAndQty,
                buyerIdentityInput,
                client,
            );
            shippingRatesBySupplier.set(sessionId, supplierShippingRate);
        }),
    );

    return calculateTotalShippingRates(shippingRatesBySupplier);
}

export default getShippingRates;
