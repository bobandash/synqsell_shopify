import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { StatusCodes } from 'http-status-codes';
import logger from '~/logger';
import { getIdMappedToStoreUrl } from '~/services/shopify/products';
import { authenticate } from '~/shopify.server';
import { getJSONError } from '~/util';

// resource route for getting information for price list
export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    const sessionId = session.id;
    const url = new URL(request.url);
    const paramsString = url.searchParams.get('params');
    if (paramsString) {
      const params = JSON.parse(decodeURIComponent(paramsString));
      const productIds: string[] = params.productIds;
      const productIdToStoreUrl = await getIdMappedToStoreUrl(
        admin.graphql,
        sessionId,
        productIds,
      );
      return json(productIdToStoreUrl, StatusCodes.OK);
    }

    logger.error('No parameters passed to get store urls from product ids.');
    throw json(
      { error: 'No parameters passed to get store urls from product ids.' },
      StatusCodes.BAD_REQUEST,
    );
  } catch (error) {
    throw getJSONError(error, 'settings');
  }
};
