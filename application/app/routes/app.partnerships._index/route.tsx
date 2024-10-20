import type { LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { StatusCodes } from 'http-status-codes';
import { ROLES } from '~/constants';
import { hasRole } from '~/services/models/roles';
import { authenticate } from '~/shopify.server';
import { createJSONMessage, getJSONError } from '~/util';

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

    throw createJSONMessage(
      'User is not retailer or supplier. Unauthorized to view partnership information.',
      StatusCodes.UNAUTHORIZED,
    );
  } catch (error) {
    throw getJSONError(error, '/partnerships/_index');
  }
};

const Partnerships = () => {
  useLoaderData();
  return null;
};

export default Partnerships;
