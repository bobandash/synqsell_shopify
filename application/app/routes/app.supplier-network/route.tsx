import {
  Button,
  Card,
  EmptyState,
  InlineGrid,
  InlineStack,
  Page,
} from '@shopify/polaris';
import SupplierCard from './components/SupplierCard';
import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import { StatusCodes } from 'http-status-codes';
import { createJSONError, getRouteError, logError } from '~/lib/utils/server';
import {
  convertFormDataToObject,
  isActionDataError,
  isActionDataSuccess,
} from '~/lib/utils';
import { authenticate } from '~/shopify.server';
import { hasRole } from '~/services/models/roles.server';
import { ROLES } from '~/constants';
import {
  useActionData,
  useLoaderData,
  useRevalidator,
  useSearchParams,
} from '@remix-run/react';
import { getSupplierPaginatedInfo } from './loader/getSupplierPaginatedInfo';
import type {
  Supplier,
  SupplierPaginatedInfoProps,
} from './loader/getSupplierPaginatedInfo';
import { PriceListRequestModal } from './components';
import { PaddedBox } from '~/components';
import { ChevronLeftIcon, ChevronRightIcon } from '@shopify/polaris-icons';
import { useCallback, useEffect, useState } from 'react';
import { INTENTS, MODALS } from './constants';
import { requestAccessAction } from './actions';
import type { RequestAccessFormData } from './actions/requestAccessAction';
import { userHasStripePaymentMethod } from '~/services/models/stripeCustomerAccount.server';
import createHttpError from 'http-errors';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id: sessionId } = session;
  const [isRetailer, hasStripePaymentMethod] = await Promise.all([
    hasRole(sessionId, ROLES.RETAILER),
    userHasStripePaymentMethod(sessionId),
  ]);
  const { searchParams } = new URL(request.url);
  const next = searchParams.get('next');
  const prev = searchParams.get('prev');
  const isReverseDirection = prev ? true : false;
  let cursor = null;
  if (next) {
    cursor = next;
  } else if (prev) {
    cursor = prev;
  }

  if (!isRetailer) {
    throw new createHttpError.Unauthorized(
      'Unauthorized. User is not a retailer',
    );
  } else if (!hasStripePaymentMethod) {
    throw new createHttpError.Unauthorized(
      'Unauthorized. User is does not have a payment method',
    );
  }
  const supplierInfo = await getSupplierPaginatedInfo({
    isReverseDirection,
    sessionId,
    cursor,
  });
  return json(supplierInfo, StatusCodes.OK);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  let sessionId: string | undefined;

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
    return createJSONError(
      `Intent ${intent} is not valid`,
      StatusCodes.NOT_IMPLEMENTED,
    );
  } catch (error) {
    logError(error, { sessionId });
    return getRouteError(
      error,
      'Failed to process request. Please try again later.',
    );
  }
};

const SupplierNetwork = () => {
  const data = useLoaderData<typeof loader>() as SupplierPaginatedInfoProps;
  const actionData = useActionData<typeof action>();
  const [suppliers, setSuppliers] = useState<Supplier[]>(data.suppliers);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [nextCursor, setNextCursor] = useState(data.nextCursor);
  const [prevCursor, setPrevCursor] = useState(data.prevCursor);
  const [, setSearchParams] = useSearchParams();
  const revalidator = useRevalidator();

  useEffect(() => {
    setSuppliers(data.suppliers);
    setNextCursor(data.nextCursor);
    setPrevCursor(data.prevCursor);
    shopify.modal.hide(MODALS.REQUEST_ACCESS_MODAL);
  }, [data]);

  useEffect(() => {
    if (!actionData) {
      return;
    }
    if (isActionDataError(actionData)) {
      shopify.toast.show(actionData.error.message, { isError: true });
    } else if (isActionDataSuccess(actionData)) {
      shopify.toast.show(actionData.message);
    }
  }, [actionData]);

  const navigateNextCursor = useCallback(() => {
    if (nextCursor) {
      setSearchParams({ next: nextCursor });
      revalidator.revalidate();
    }
  }, [nextCursor, setSearchParams, revalidator]);

  const navigatePrevCursor = useCallback(() => {
    if (prevCursor) {
      setSearchParams({ prev: prevCursor });
      revalidator.revalidate();
    }
  }, [prevCursor, setSearchParams, revalidator]);

  if (suppliers.length === 0) {
    return (
      <Page
        title="Supplier Network"
        subtitle="Discover potential suppliers to partner with!"
      >
        <Card>
          <EmptyState
            heading="Become the first supplier on SynqSell and become discovered by retailers across the world!"
            action={{ content: 'Get Started', url: '/app' }}
            secondaryAction={{
              content: 'Learn more',
              url: 'https://www.synqsell.com',
              target: '_blank',
            }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          />
        </Card>
      </Page>
    );
  }

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
        gap={'200'}
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
      {prevCursor ||
        (nextCursor && (
          <>
            <InlineStack gap={'200'} align={'center'}>
              <Button
                icon={ChevronLeftIcon}
                disabled={!prevCursor}
                onClick={navigatePrevCursor}
              />
              <Button
                icon={ChevronRightIcon}
                disabled={!nextCursor}
                onClick={navigateNextCursor}
              />
            </InlineStack>
          </>
        ))}
      <PaddedBox />
    </Page>
  );
};

export default SupplierNetwork;
