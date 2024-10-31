import {
  Button,
  Card,
  EmptyState,
  InlineGrid,
  InlineStack,
  Page,
} from '@shopify/polaris';
import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import { StatusCodes } from 'http-status-codes';
import { convertFormDataToObject } from '~/lib/utils';
import { createJSONMessage, getJSONError } from '~/lib/utils/server';
import { authenticate } from '~/shopify.server';
import { hasRole } from '~/services/models/roles';
import { ROLES } from '~/constants';
import {
  useActionData,
  useLoaderData,
  useRevalidator,
  useSearchParams,
} from '@remix-run/react';
import { PaddedBox } from '~/components';
import { ChevronLeftIcon, ChevronRightIcon } from '@shopify/polaris-icons';
import { useCallback, useEffect, useState } from 'react';
import { getRetailerPaginatedInfo } from './loader';
import { INTENTS, MODALS } from './constants';
import type {
  Retailer,
  RetailerPaginatedInfoProps,
} from './loader/getRetailerPaginatedInfo';
import { InitiatePartnershipModal, RetailerCard } from './components';
import { getAllPriceLists } from '~/services/models/priceList';
import { initiatePartnershipAction } from './actions';
import { userHasStripeConnectAccount } from '~/services/models/stripeConnectAccount';

type InitiatePartnershipData = {
  intent: string;
  retailerId: string;
  message: string;
  priceListIds: string[];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const { id: sessionId } = session;

    const [isSupplier, hasStripeConnectAccount] = await Promise.all([
      hasRole(sessionId, ROLES.SUPPLIER),
      userHasStripeConnectAccount(sessionId),
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

    if (!isSupplier) {
      throw createJSONMessage(
        'Unauthorized. User is not supplier.',
        StatusCodes.UNAUTHORIZED,
      );
    }

    if (!hasStripeConnectAccount) {
      throw createJSONMessage(
        'User does not have a payment method set.',
        StatusCodes.UNAUTHORIZED,
      );
    }

    const retailerPaginatedInfo = await getRetailerPaginatedInfo({
      isReverseDirection,
      sessionId,
      cursor,
    });
    const priceLists = await getAllPriceLists(sessionId);

    return json({ retailerPaginatedInfo, priceLists }, StatusCodes.OK);
  } catch (error) {
    throw getJSONError(error, '/app/retailer-network');
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
      case INTENTS.INITIATE_PARTNERSHIP:
        return await initiatePartnershipAction({
          supplierId: sessionId,
          ...(formDataObject as InitiatePartnershipData),
        });
    }

    return createJSONMessage('Not implemented', StatusCodes.NOT_IMPLEMENTED);
  } catch (error) {
    return getJSONError(error, '/app/retailer-network');
  }
};

const SupplierNetwork = () => {
  const { retailerPaginatedInfo, priceLists } = useLoaderData<
    typeof loader
  >() as RetailerPaginatedInfoProps;

  const actionData = useActionData<typeof action>();
  const [retailers, setRetailers] = useState<Retailer[]>(
    retailerPaginatedInfo.retailers,
  );
  const [selectedRetailerId, setSelectedRetailerId] = useState('');
  const [nextCursor, setNextCursor] = useState(
    retailerPaginatedInfo.nextCursor,
  );
  const [prevCursor, setPrevCursor] = useState(
    retailerPaginatedInfo.prevCursor,
  );
  const [selectedPriceListIds, setSelectedPriceListIds] = useState<string[]>(
    [],
  );

  const [, setSearchParams] = useSearchParams();
  const revalidator = useRevalidator();

  useEffect(() => {
    setRetailers(retailerPaginatedInfo.retailers);
    setNextCursor(retailerPaginatedInfo.nextCursor);
    setPrevCursor(retailerPaginatedInfo.prevCursor);
  }, [retailerPaginatedInfo]);

  useEffect(() => {
    if (actionData && 'message' in actionData) {
      shopify.modal.hide(MODALS.INITIATE_PARTNERSHIP);
      shopify.toast.show(actionData.message as string);
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

  const handleSelectPriceListIds = useCallback((priceListIds: string[]) => {
    setSelectedPriceListIds(priceListIds);
  }, []);

  if (retailers.length === 0) {
    return (
      <Page
        title="Retailer Network"
        subtitle="Discover potential retailers to partner with!"
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
      title="Retailer Network"
      subtitle="Discover potential retailers to partner with!"
    >
      <InlineGrid
        columns={{
          sm: 1,
          md: 2,
        }}
        gap={'200'}
      >
        {retailers.map((retailer) => (
          <RetailerCard
            key={retailer.id}
            retailer={retailer}
            setSelectedRetailerId={setSelectedRetailerId}
          />
        ))}
      </InlineGrid>
      <InitiatePartnershipModal
        selectedRetailerId={selectedRetailerId}
        priceLists={priceLists}
        selectedPriceListIds={selectedPriceListIds}
        handleSelectPriceListIds={handleSelectPriceListIds}
      />
      <PaddedBox />
      {(prevCursor || nextCursor) && (
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
      )}
      <PaddedBox />
    </Page>
  );
};

export default SupplierNetwork;
