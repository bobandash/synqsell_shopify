import type { GraphQL } from '~/types';
import {
  addStorefrontAccessToken,
  getStorefrontAccessToken,
  hasStorefrontAccessToken,
} from '~/services/models/session.server';
import { createStorefrontAccessToken as createStorefrontAccessTokenShopify } from '~/services/shopify/storefrontAccessToken';

export async function getOrCreateStorefrontAccessToken(
  sessionId: string,
  graphql: GraphQL,
) {
  let storefrontAccessToken = null;
  const storefrontAccessTokenExists = await hasStorefrontAccessToken(sessionId);
  if (storefrontAccessTokenExists) {
    storefrontAccessToken = await getStorefrontAccessToken(sessionId);
  } else {
    storefrontAccessToken = await createStorefrontAccessTokenShopify(graphql);
    await addStorefrontAccessToken(sessionId, storefrontAccessToken);
  }
  return storefrontAccessToken;
}
