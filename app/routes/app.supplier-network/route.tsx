import { Layout, Page } from '@shopify/polaris';
import SupplierCard from './components/SupplierCard';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { StatusCodes } from 'http-status-codes';
import { getJSONError } from '~/util';

import { authenticate } from '~/shopify.server';
import { hasRole } from '~/services/models/roles';
import { ROLES } from '~/constants';
import { useLoaderData } from '@remix-run/react';
import {
  getSupplierPaginatedInfo,
  type SupplierPaginatedInfoProps,
} from './loader/getSupplierPaginatedInfo';
import { SupplierCardMock } from './components';
import { PaddedBox } from '~/components';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const { id: sessionId } = session;
    const isRetailer = await hasRole(sessionId, ROLES.RETAILER);
    // TODO: handle errors better
    if (!isRetailer) {
      throw json(
        { error: 'Unauthorized. User is not retailer.' },
        StatusCodes.UNAUTHORIZED,
      );
    }
    // todo: add cursors on refresh
    const supplierInfo = await getSupplierPaginatedInfo(false);
    return json(supplierInfo, StatusCodes.OK);
  } catch (error) {
    throw getJSONError(error, 'supplier network');
  }
};

const SupplierNetwork = () => {
  const { suppliers, nextCursor, prevCursor } = useLoaderData<
    typeof loader
  >() as SupplierPaginatedInfoProps;

  return (
    <Page
      title="Supplier Network"
      subtitle="Discover potential suppliers to partner with!"
    >
      <Layout>
        {suppliers.map((supplier) => (
          <SupplierCard key={supplier.id} supplier={supplier} />
        ))}
        <SupplierCardMock />
      </Layout>
      <PaddedBox />
    </Page>
  );
};

export default SupplierNetwork;
