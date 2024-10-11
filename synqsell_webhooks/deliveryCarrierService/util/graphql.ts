/* eslint-disable @typescript-eslint/no-explicit-any */
async function fetchAndValidateGraphQLAdminApi<T>(
    shop: string,
    accessToken: string,
    query: string,
    variables: any,
): Promise<T> {
    const url = `https://${shop}/admin/api/2024-07/graphql.json`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({ query, variables }),
    });
    const { data } = await response.json();
    if (!data) {
        throw new Error('No data returned from GraphQL query');
    }
    return data as T;
}

async function mutateAndValidateGraphQLAdminApi<T>(
    shop: string,
    accessToken: string,
    mutation: string,
    variables: any,
    defaultErrorMessage: string,
): Promise<T> {
    const url = `https://${shop}/admin/api/2024-07/graphql.json`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({ query: mutation, variables }),
    });
    const { data } = await response.json();
    if (!data) {
        throw new Error(defaultErrorMessage);
    }
    const mutationName = Object.keys(data)[0];
    const mutationData = data[mutationName];
    if (mutationData.userErrors && mutationData.userErrors.length > 0) {
        throw new Error(mutationData.userErrors.map((error: any) => error.message).join(' '));
    }
    return data as T;
}

// only the api gateway functions that need to calculate shipping should use the storefront api values
// this is to imitate a customer adding the imported products to cart, which cannot be done using the admin api
async function mutateAndValidateGraphQLStorefrontApi<T>(
    shop: string,
    storefrontAccessToken: string,
    mutation: string,
    variables: any,
    defaultErrorMessage: string,
): Promise<T> {
    const url = `https://${shop}/api/2024-07/graphql.json`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
        },
        body: JSON.stringify({ query: mutation, variables }),
    });
    const { data } = await response.json();
    if (!data) {
        throw new Error(defaultErrorMessage);
    }
    const mutationName = Object.keys(data)[0];
    const mutationData = data[mutationName];
    if (mutationData.userErrors && mutationData.userErrors.length > 0) {
        throw new Error(mutationData.userErrors.map((error: any) => error.message).join(' '));
    }
    return data as T;
}

async function fetchAndValidateGraphQLStorefrontApi<T>(
    shop: string,
    storefrontAccessToken: string,
    query: string,
    variables: any,
): Promise<T> {
    const url = `https://${shop}/admin/api/2024-07/graphql.json`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
        },
        body: JSON.stringify({ query, variables }),
    });
    const { data } = await response.json();
    if (!data) {
        throw new Error('No data returned from GraphQL query');
    }
    return data as T;
}

export {
    fetchAndValidateGraphQLAdminApi,
    mutateAndValidateGraphQLAdminApi,
    mutateAndValidateGraphQLStorefrontApi,
    fetchAndValidateGraphQLStorefrontApi,
};
