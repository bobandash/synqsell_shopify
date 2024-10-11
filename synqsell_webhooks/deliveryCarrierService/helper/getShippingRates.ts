import type { PoolClient } from 'pg';
import { createMapToRestObj } from '../util';
import { BuyerIdentityInput, OrderShopifyVariantDetail, Session } from '../types';
import { CART_CREATE_MUTATION } from '../graphql/storefront/graphql';
import { meros } from 'meros';

type ImportedVariantDetail = {
    retailerShopifyVariantId: string;
    supplierShopifyVariantId: string;
    supplierId: string;
};

type ShopifyVariantIdAndQty = {
    shopifyVariantId: string;
    quantity: number;
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
        throw new Error('Failed to get all imported variants the retailer has.');
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

// helper function for getting the shipping rates for one supplier
async function getStorefrontAccessToken(sessionId: string, client: PoolClient) {
    try {
        const sessionQuery = `SELECT "storefrontAccessToken" FROM "Session" WHERE "id" = $1`;
        const res = await client.query(sessionQuery, [sessionId]);
        const storefrontAccessToken = res.rows[0].storefrontAccessToken;
        if (!storefrontAccessToken) {
            throw new Error(`Session id ${sessionId} has no storefront access token.`);
        }
        return storefrontAccessToken as string;
    } catch (error) {
        throw new Error('Failed to get session ' + sessionId);
    }
}

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

async function getSupplierShippingRate(
    supplierSessionId: string,
    shopifyVariantIdsAndQty: ShopifyVariantIdAndQty[],
    buyerIdentityInput: BuyerIdentityInput,
    client: PoolClient,
) {
    const storefrontAccessToken = await getStorefrontAccessToken(supplierSessionId, client);
    const supplierSession = await getSession(supplierSessionId, client);
    const cartCreateInput = {
        lines: shopifyVariantIdsAndQty.map((lineItem) => ({
            merchandiseId: lineItem.shopifyVariantId,
            quantity: lineItem.quantity,
        })),
        ...buyerIdentityInput,
    };

    // calculated carrier shipping rates are when the customer reach the checkout screen, and Shopify calculates the exact cost of USPS or any shipping carrier service to charge the customer
    // the CART_CREATE_MUTATION retrieves the calculated shipping rates and static shipping rates
    // however, the only way to get calculated carrier shipping rates from Shopify is by using multipart responses, where data is provided in chunks
    // so I have to use a package like meros or handle it manually
    // https://github.com/graphql/graphql-over-http/blob/c1acb54053679f08939c9cdcee00b72d77c42211/rfcs/IncrementalDelivery.md
    const url = `https://${supplierSession.shop}/api/2024-07/graphql.json`;
    const parts = await fetch(url, {
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
    }).then(meros);

    if (!(Symbol.asyncIterator in parts)) {
        throw new Error('Could not extract delivery group chunk.');
    }
    for await (const part of parts) {
        const { json } = part;
        console.log(part);
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

    // TODO: add all supplier shipping rates
    const supplierShippingRates: void[] = [];
    await Promise.all([
        supplierSessionIds.map(async (sessionId) => {
            const shopifyVariantIdsAndQty = shopifyVariantIdsAndQtyBySupplier.get(sessionId) ?? []; // this should not null-coalesce, only for ts
            const supplierShippingRate = await getSupplierShippingRate(
                sessionId,
                shopifyVariantIdsAndQty,
                buyerIdentityInput,
                client,
            );
            supplierShippingRates.push(supplierShippingRate);
        }),
    ]);

    return {
        rates: [
            {
                service_name: 'canadapost-overnight',
                service_code: 'ON',
                total_price: '1295',
                description: 'This is the fastest option by far',
                currency: 'CAD',
                min_delivery_date: '2013-04-12 14:48:45 -0400',
                max_delivery_date: '2013-04-12 14:48:45 -0400',
            },
            {
                service_name: 'fedex-2dayground',
                service_code: '2D',
                total_price: '2934',
                currency: 'USD',
                min_delivery_date: '2013-04-12 14:48:45 -0400',
                max_delivery_date: '2013-04-12 14:48:45 -0400',
            },
            {
                service_name: 'fedex-priorityovernight',
                service_code: '1D',
                total_price: '3587',
                currency: 'USD',
                min_delivery_date: '2013-04-12 14:48:45 -0400',
                max_delivery_date: '2013-04-12 14:48:45 -0400',
            },
        ],
    };
}

export default getShippingRates;
