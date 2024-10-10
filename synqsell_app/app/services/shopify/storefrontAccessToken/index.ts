import type { GraphQL } from '~/types';
import { CREATE_STOREFRONT_ACCESS_TOKEN } from './graphql';
import { errorHandler } from '~/services/util';
import { getUserError } from '../util';

export async function createStorefrontAccessToken(
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    const response = await graphql(CREATE_STOREFRONT_ACCESS_TOKEN, {
      variables: {
        input: {
          title: 'SynqSell',
        },
      },
    });

    const { data } = await response.json();
    const storefrontAccessTokenCreate = data?.storefrontAccessTokenCreate;

    if (
      !storefrontAccessTokenCreate ||
      !storefrontAccessTokenCreate.storefrontAccessToken ||
      storefrontAccessTokenCreate.userErrors.length > 0
    ) {
      throw getUserError({
        defaultMessage:
          'Data is missing from creating a fulfillment service in Shopify.',
        userErrors: storefrontAccessTokenCreate?.userErrors,
        parentFunc: createStorefrontAccessToken,
        data: { sessionId },
      });
    }

    return storefrontAccessTokenCreate.storefrontAccessToken.accessToken;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create storefront access token on shopify.',
      createStorefrontAccessToken,
      { sessionId },
    );
  }
}
