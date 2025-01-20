import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { StatusCodes } from 'http-status-codes';
import { authenticate } from '~/shopify.server';
import { getRouteError, logError } from '~/lib/utils/server';
import createHttpError from 'http-errors';
import getQueryStr from '~/services/shopify/utils/getQueryStr';
import { queryInternalStoreAdminAPI } from '~/services/shopify/utils';
import type { GraphQL } from '~/types';
import type { ProductUrlQuery } from '~/services/shopify/products/types';
import { GET_PRODUCT_URL } from '~/services/shopify/products/graphql';
import { nodesFromEdges } from '@shopify/admin-graphql-api-utilities';

async function getIdMappedToStoreUrl(graphql: GraphQL, productIds: string[]) {
  if (productIds.length === 0) {
    return {};
  }
  const numProducts = productIds.length;
  const queryStr = getQueryStr(productIds);
  const data = await queryInternalStoreAdminAPI<ProductUrlQuery>(
    graphql,
    GET_PRODUCT_URL,
    {
      first: numProducts,
      query: queryStr,
    },
  );
  const edges = data.products.edges;
  const nodes = nodesFromEdges(edges);
  const idToStoreUrl = nodes.reduce((acc, node) => {
    const { id, onlineStoreUrl } = node;
    return {
      ...acc,
      [id]: onlineStoreUrl,
    };
  }, {});

  return idToStoreUrl;
}

// resource route for getting information for price list
export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const {
      admin: { graphql },
    } = await authenticate.admin(request);
    const url = new URL(request.url);
    const paramsString = url.searchParams.get('params');
    if (!paramsString) {
      throw new createHttpError.BadRequest(
        'No parameters passed to get store urls from product ids.',
      );
    }
    const params = JSON.parse(decodeURIComponent(paramsString));
    const productIds: string[] = params.productIds;
    const productIdToStoreUrl = await getIdMappedToStoreUrl(
      graphql,
      productIds,
    );
    return json(productIdToStoreUrl, StatusCodes.OK);
  } catch (error) {
    logError(error);
    return getRouteError(error, 'Failed to retrieve Shopify product urls.');
  }
};
