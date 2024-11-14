import type { LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { ROLES } from '~/constants';
import { hasRole } from '~/services/models/roles.server';
import { authenticate } from '~/shopify.server';
import { getRouteError, logError } from '~/lib/utils/server';
import createHttpError from 'http-errors';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session, redirect } = await authenticate.admin(request);
    const { id: sessionId } = session;
    const [isRetailer, isSupplier] = await Promise.all([
      hasRole(sessionId, ROLES.RETAILER),
      hasRole(sessionId, ROLES.SUPPLIER),
    ]);

    if (isRetailer) {
      return redirect('/app/partnerships/supplier');
    } else if (isSupplier) {
      return redirect('/app/partnerships/retailer');
    }
    throw new createHttpError.Unauthorized(
      'User is not retailer or supplier. Unauthorized to view partnership information.',
    );
  } catch (error) {
    logError(error, 'Loader: Partnerships');
    throw getRouteError('Failed to load partnerships route.', error);
  }
};

const Partnerships = () => {
  useLoaderData();
  return null;
};

export default Partnerships;
