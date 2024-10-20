import type { GraphQL } from '~/types';
import { CREATE_STOREFRONT_ACCESS_TOKEN } from './graphql';
import { mutateInternalStoreAdminAPI } from '../util';
import type { StorefrontAccessTokenCreateMutation } from '~/types/admin.generated';

export async function createStorefrontAccessToken(graphql: GraphQL) {
  const data =
    await mutateInternalStoreAdminAPI<StorefrontAccessTokenCreateMutation>(
      graphql,
      CREATE_STOREFRONT_ACCESS_TOKEN,
      {
        input: {
          title: 'SynqSell',
        },
      },
      'Failed to create a storefront access token in Shopify.',
    );

  return (
    data.storefrontAccessTokenCreate?.storefrontAccessToken?.accessToken ?? ''
  );
}
