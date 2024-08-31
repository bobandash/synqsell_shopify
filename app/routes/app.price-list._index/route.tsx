import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  IndexTable,
  Page,
  Text,
  useIndexResourceState,
} from '@shopify/polaris';
import { type IndexTableHeading } from '@shopify/polaris/build/ts/src/components/IndexTable';
import { type NonEmptyArray } from '@shopify/polaris/build/ts/src/types';
import { ToolsIcon } from '~/assets';
import styles from './styles.module.css';
import {
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
import logger from '~/logger';
import { convertFormDataToObject, getJSONError } from '~/util';
import { authenticate } from '~/shopify.server';
import {
  getPriceListTableInfo,
  type PriceListTableInfoProps,
} from '~/services/models/priceList';
import { StatusCodes } from 'http-status-codes';
import { useEffect, useState, type FC } from 'react';
import { convertToTitleCase } from '../util';
import { useAppBridge } from '@shopify/app-bridge-react';
import { MODALS } from './constants';
import DeletePriceListModal from './_components/DeletePriceListModal';
import { deletePriceListAction } from './actions/deletePriceListAction';

type RowProps = {
  data: PriceListTableInfoProps;
  index: number;
  selected: boolean;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const { id: sessionId } = session;
    const priceListTableInfo = await getPriceListTableInfo(sessionId);
    return json(priceListTableInfo, { status: StatusCodes.OK });
  } catch (error) {
    logger.error(error);
    throw getJSONError(error, 'price list');
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
      case MODALS.DELETE_PRICE_LIST:
        return deletePriceListAction(formDataObject, sessionId);
    }
    return json(
      { error: { message: 'Not Implemented. Please contact support.' } },
      { status: StatusCodes.NOT_IMPLEMENTED },
    );
  } catch (error) {
    logger.error(error);
  }

  return null;
};

const PriceList = () => {
  const data = useLoaderData<
    typeof loader
  >() as unknown as PriceListTableInfoProps[];
  const [priceListTableData, setPriceListTableData] = useState(data);
  const [, setPrevPriceListTableData] = useState(data);
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const location = useLocation();
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
  const deletePriceListFetcher = useFetcher({ key: MODALS.DELETE_PRICE_LIST });
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

  // useEffect(() => {
  //   if (
  //     deletePriceListFetcher.formData &&
  //     deletePriceListFetcher.formData.get('priceListIds') &&
  //     deletePriceListFetcher.state === 'submitting'
  //   ) {
  //     const priceListIdString = deletePriceListFetcher.formData.get(
  //       'priceListIds',
  //     ) as string;
  //     const deletedPriceListIds = new Set(
  //       JSON.parse(priceListIdString) as string[],
  //     );
  //     // optimistic render for deleting the price list
  //     setPrevPriceListTableData([...priceListTableData]);
  //     setPriceListTableData((prev) => {
  //       return prev.filter((item) => !deletedPriceListIds.has(item.id));
  //     });
  //     clearSelection();
  //   }
  // }, [deletePriceListFetcher, priceListTableData, clearSelection]);

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
              <Row
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

const EmptyState = () => {
  return (
    <Box paddingBlock={'200'}>
      <BlockStack inlineAlign={'center'} gap={'300'}>
        <img
          src={ToolsIcon}
          alt="create price list icon"
          className={`${styles.icon}`}
        />
        <Text as="h2" variant="headingLg">
          Build Your Price List
        </Text>
        <Text as="p" variant={'bodyMd'}>
          Start inviting retailers to import your products today!
        </Text>
      </BlockStack>
    </Box>
  );
};

const Row: FC<RowProps> = ({ data, index, selected }) => {
  const {
    id,
    name,
    isGeneral,
    pricingStrategy,
    numProducts,
    numRetailers,
    sales,
    margin,
  } = data;

  const navigate = useNavigate();
  const location = useLocation();
  function navigateToPriceList() {
    navigate(`${location.pathname}/${id}`);
  }

  const marginText = margin
    ? `${convertToTitleCase(pricingStrategy)} (${margin}%)`
    : convertToTitleCase(pricingStrategy);

  return (
    <IndexTable.Row
      id={id}
      key={id}
      selected={selected}
      position={index}
      onClick={navigateToPriceList}
    >
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {name}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {isGeneral ? (
          <Badge tone="success">General</Badge>
        ) : (
          <Badge tone="info">Private</Badge>
        )}
      </IndexTable.Cell>
      <IndexTable.Cell>{numProducts}</IndexTable.Cell>
      <IndexTable.Cell>{numRetailers}</IndexTable.Cell>
      <IndexTable.Cell>{sales}</IndexTable.Cell>
      <IndexTable.Cell>{marginText}</IndexTable.Cell>
    </IndexTable.Row>
  );
};

export default PriceList;
