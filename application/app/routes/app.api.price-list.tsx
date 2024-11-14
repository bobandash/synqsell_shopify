import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { StatusCodes } from 'http-status-codes';
import { getIdMappedToStoreUrl } from '~/services/shopify/products';
import { authenticate } from '~/shopify.server';
import { getRouteError, logError } from '~/lib/utils/server';
import createHttpError from 'http-errors';

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
    logError(error, 'API: Get store url');
    return getRouteError('Failed to retrieve Shopify product urls.', error);
  }
};
