import { json, redirect } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { StatusCodes } from 'http-status-codes';
import { ROLES } from '~/constants';
import { hasRole } from '~/services/models/roles';
import { authenticate } from '~/shopify.server';
import { getJSONError } from '~/util';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
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

    return json(
      {
        message:
          'User is not retailer or supplier. Unauthorized to view price list.',
      },
      StatusCodes.UNAUTHORIZED,
    );
  } catch (error) {
    throw getJSONError(error, 'admin network');
  }
};

const Partnerships = () => {
  return null;
};

export default Partnerships;
