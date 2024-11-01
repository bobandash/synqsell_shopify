import {
  Button,
  Card,
  IndexTable,
  Page,
  useIndexResourceState,
} from '@shopify/polaris';
import { type IndexTableHeading } from '@shopify/polaris/build/ts/src/components/IndexTable';
import { type NonEmptyArray } from '@shopify/polaris/build/ts/src/types';

import {
  useActionData,
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
} from '@remix-run/react';
import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import { convertFormDataToObject } from '~/lib/utils';
import { createJSONError, handleRouteError } from '~/lib/utils/server';
import { authenticate } from '~/shopify.server';
import { StatusCodes } from 'http-status-codes';
import { useEffect, useState } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { INTENTS, MODALS } from './constants';
import { DeletePriceListModal, EmptyState } from './components';
import { deletePriceListAction } from './actions';
import type { PriceListTableInfoProps } from './types';
import { getPriceListTableInfo } from './loader';
import TableRow from './components/TableRow';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const { id: sessionId } = session;
    const priceListTableInfo = await getPriceListTableInfo(sessionId);
    return json(priceListTableInfo, { status: StatusCodes.OK });
  } catch (error) {
    throw handleRouteError(error, '/app/price-list/index');
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
      case INTENTS.DELETE_PRICE_LIST:
        return await deletePriceListAction(formDataObject, sessionId);
      default:
        return createJSONError(
          `Intent ${intent} is not valid`,
          StatusCodes.NOT_IMPLEMENTED,
        );
    }
  } catch (error) {
    return handleRouteError(error, '/app/price-list/index');
  }
};

const PriceList = () => {
  const data = useLoaderData<
    typeof loader
  >() as unknown as PriceListTableInfoProps[];
  const actionData = useActionData<typeof action>();

  const [priceListTableData, setPriceListTableData] = useState(data);
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const location = useLocation();
  const deletePriceListFetcher = useFetcher({ key: MODALS.DELETE_PRICE_LIST });

  const headings: NonEmptyArray<IndexTableHeading> = [
    { title: 'Name' },
    { title: 'Type' },
    { title: 'Products' },
    { title: 'Retailers' },
    { title: 'Sales Generated' },
    { title: 'Pricing Strategy' },
  ];
  const resourceName = {
    singular: 'Price List',
    plural: 'Price Lists',
  };
  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  } = useIndexResourceState(priceListTableData);
  function navigateCreatePriceList() {
    const newPriceListRoute = `${location.pathname}/new`;
    navigate(newPriceListRoute);
  }

  const deleteText =
    selectedResources.length === 0
      ? `Delete Selected`
      : `Delete Selected (${selectedResources.length})`;

  function openDeleteModal() {
    shopify.modal.show(MODALS.DELETE_PRICE_LIST);
  }

  useEffect(() => {
    if (data.length < priceListTableData.length) {
      setPriceListTableData(data);
      clearSelection();
      shopify.modal.hide(MODALS.DELETE_PRICE_LIST);
    }
  }, [data, clearSelection, priceListTableData, shopify]);

  // render the status message as a shopify toast
  // shopify recommends using a banner instead of toast for error messages
  useEffect(() => {
    if (!actionData) {
      return;
    }
    if ('message' in actionData) {
      shopify.toast.show(actionData.message);
    }
  }, [actionData, shopify]);

  return (
    <>
      <DeletePriceListModal priceListIds={selectedResources} />
      <Page
        title="Price lists"
        subtitle="Create and edit price lists for retailers to import your products!"
        primaryAction={{
          content: 'Create Price List',
          onAction: navigateCreatePriceList,
        }}
        secondaryActions={
          <Button
            variant="primary"
            tone="critical"
            disabled={selectedResources.length === 0}
            loading={deletePriceListFetcher.state === 'submitting'}
            onClick={openDeleteModal}
          >
            {deleteText}
          </Button>
        }
      >
        <Card padding={'0'}>
          <IndexTable
            resourceName={resourceName}
            headings={headings}
            itemCount={priceListTableData.length}
            selectedItemsCount={
              allResourcesSelected ? 'All' : selectedResources.length
            }
            onSelectionChange={handleSelectionChange}
            emptyState={<EmptyState />}
          >
            {priceListTableData.map((priceListRowData, index) => (
              <TableRow
                key={priceListRowData.id}
                data={priceListRowData}
                index={index}
                selected={selectedResources.includes(priceListRowData.id)}
              />
            ))}
          </IndexTable>
        </Card>
      </Page>
    </>
  );
};

export default PriceList;
