import type { GraphQL } from '~/types';
import {
  addStorefrontAccessToken,
  getStorefrontAccessToken,
  hasStorefrontAccessToken,
} from '~/services/models/session';
import { createStorefrontAccessToken as createStorefrontAccessTokenShopify } from '~/services/shopify/storefrontAccessToken';
import { errorHandler } from '~/lib/utils/server';

export async function getOrCreateStorefrontAccessToken(
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    let storefrontAccessToken = null;
    const storefrontAccessTokenExists =
      await hasStorefrontAccessToken(sessionId);

    if (storefrontAccessTokenExists) {
      storefrontAccessToken = await getStorefrontAccessToken(sessionId);
    } else {
      storefrontAccessToken = await createStorefrontAccessTokenShopify(graphql);
      await addStorefrontAccessToken(sessionId, storefrontAccessToken);
    }
    return storefrontAccessToken;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get or create storefront access token.',
      getOrCreateStorefrontAccessToken,
      { sessionId },
    );
  }
}
