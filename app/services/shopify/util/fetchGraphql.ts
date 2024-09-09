import fetch from 'node-fetch';

async function fetchGraphQL(
  shop: string,
  accessToken: string,
  query: string,
  variables: any,
) {
  const url = `https://${shop}/admin/api/2024-07/graphql.json`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  return response;
}

export default fetchGraphQL;
