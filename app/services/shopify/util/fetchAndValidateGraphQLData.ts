import fetch from 'node-fetch';

// this function is for making fetch requests to other stores
async function fetchAndValidateGraphQLData<T>(
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
  console.log(data);
  if (!data) {
    throw new Error('No data returned from GraphQL query');
  }
  return data as T;
}

export default fetchAndValidateGraphQLData;
