import type { GraphQL } from '~/types';
import { errorHandler } from '~/services/util';
import {
  addStorefrontAccessToken as addStorefrontAccessTokenDb,
  getStorefrontAccessToken as getStorefrontAccessTokenDb,
  hasStorefrontAccessToken as hasStorefrontAccessTokenDb,
} from '~/services/models/session';
import { createStorefrontAccessToken as createStorefrontAccessTokenShopify } from '~/services/shopify/storefrontAccessToken';

export async function getOrCreateStorefrontAccessToken(
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    const storefrontAccessTokenExistsDb =
      await hasStorefrontAccessTokenDb(sessionId);

    if (storefrontAccessTokenExistsDb) {
      const storefrontAccessToken = await getStorefrontAccessTokenDb(sessionId);
      return storefrontAccessToken;
    }
    const shopifyNewStorefrontAccessToken =
      await createStorefrontAccessTokenShopify(sessionId, graphql);
    await addStorefrontAccessTokenDb(
      sessionId,
      shopifyNewStorefrontAccessToken,
    );
    return shopifyNewStorefrontAccessToken;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get or create storefront access token.',
      getOrCreateStorefrontAccessToken,
      { sessionId },
    );
  }
}
