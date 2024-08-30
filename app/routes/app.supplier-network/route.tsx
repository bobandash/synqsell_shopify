import { Button, InlineGrid, InlineStack, Page } from '@shopify/polaris';
import SupplierCard from './components/SupplierCard';
import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import { StatusCodes } from 'http-status-codes';
import { convertFormDataToObject, getJSONError } from '~/util';
import { authenticate } from '~/shopify.server';
import { hasRole } from '~/services/models/roles';
import { ROLES } from '~/constants';
import { useLoaderData } from '@remix-run/react';
import { getSupplierPaginatedInfo } from './loader/getSupplierPaginatedInfo';
import type {
  Supplier,
  SupplierPaginatedInfoProps,
} from './loader/getSupplierPaginatedInfo';
import { PriceListRequestModal } from './components';
import { PaddedBox } from '~/components';
import { ChevronLeftIcon, ChevronRightIcon } from '@shopify/polaris-icons';
import { useEffect, useState } from 'react';
import { INTENTS } from './constants';
import { requestAccessAction } from './action';
import type { RequestAccessFormData } from './action/requestAccessAction';

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

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const { id: sessionId } = session;
    let formData = await request.formData();
    const intent = formData.get('intent');
    const formDataObject = convertFormDataToObject(formData);
    switch (intent) {
      case INTENTS.REQUEST_ACCESS:
        return requestAccessAction(
          formDataObject as RequestAccessFormData,
          sessionId,
        );
    }
    return json({ error: 'Not implemented' }, StatusCodes.NOT_IMPLEMENTED);
  } catch (error) {
    throw getJSONError(error, 'supplier-network');
  }
};

const SupplierNetwork = () => {
  const {
    suppliers: suppliersData,
    nextCursor,
    prevCursor,
  } = useLoaderData<typeof loader>() as SupplierPaginatedInfoProps;

  // TODO: add cursor navigation with useParams
  const [suppliers, setSuppliers] = useState<Supplier[]>(suppliersData);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  useEffect(() => {
    setSuppliers(suppliersData);
  }, [suppliersData, setSuppliers]);

  return (
    <Page
      title="Supplier Network"
      subtitle="Discover potential suppliers to partner with!"
    >
      <InlineGrid
        columns={{
          sm: 1,
          md: 2,
        }}
      >
        {suppliers.map((supplier) => (
          <SupplierCard
            key={supplier.id}
            supplier={supplier}
            setSelectedSupplierId={setSelectedSupplierId}
          />
        ))}
      </InlineGrid>
      <PriceListRequestModal priceListSupplierId={selectedSupplierId} />

      <PaddedBox />
      <InlineStack gap={'200'} align={'center'}>
        <Button icon={ChevronLeftIcon} disabled={!prevCursor} />
        <Button icon={ChevronRightIcon} disabled={!nextCursor} />
      </InlineStack>
      <PaddedBox />
    </Page>
  );
};

export default SupplierNetwork;
