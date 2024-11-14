import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import { useActionData, useLoaderData, useSubmit } from '@remix-run/react';
import {
  Badge,
  Card,
  IndexFilters,
  IndexTable,
  Link,
  Page,
  type TabProps,
  Text,
  useIndexResourceState,
  useSetIndexFiltersMode,
} from '@shopify/polaris';
import type { IndexTableHeading } from '@shopify/polaris/build/ts/src/components/IndexTable';
import type { NonEmptyArray } from '@shopify/polaris/build/ts/src/types';
import { StatusCodes } from 'http-status-codes';
import { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import { ACCESS_REQUEST_STATUS, ROLES } from '~/constants';
import { hasRole } from '~/services/models/roles.server';
import {
  getAllSupplierAccessRequests,
  type GetSupplierAccessRequestJSONProps,
} from '~/services/models/supplierAccessRequest.server';
import { authenticate } from '~/shopify.server';
import { type BulkActionsProps } from '@shopify/polaris/build/ts/src/components/BulkActions';
import { useAppBridge } from '@shopify/app-bridge-react';
import {
  updateSupplierAccessAction,
  type SupplierAccessRequestInfo,
} from './actions';
import { createJSONError, getRouteError, logError } from '~/lib/utils/server';
import {
  convertFormDataToObject,
  convertToDate,
  isActionDataError,
  isActionDataSuccess,
} from '~/lib/utils';
import createHttpError from 'http-errors';

type RowMarkupProps = {
  data: GetSupplierAccessRequestJSONProps;
  index: number;
  selected: boolean;
};

type ActionData = {
  intent: 'approve' | 'reject';
  supplierAccessRequestInfo: SupplierAccessRequestInfo[];
};

const INTENTS = {
  APPROVE: 'approve',
  REJECT: 'reject',
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const { id: sessionId } = session;
    const isAdmin = await hasRole(sessionId, ROLES.ADMIN);
    if (!isAdmin) {
      throw new createHttpError.Unauthorized(
        'Unauthorized. User is not an administrator.',
      );
    }
    const supplierAccessRequests = await getAllSupplierAccessRequests();
    return json(supplierAccessRequests, StatusCodes.OK);
  } catch (error) {
    logError(error, 'Loader: Admin Route');
    throw getRouteError('Failed to load admin route.', error);
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const formData = await request.formData();
    const data = convertFormDataToObject(formData) as ActionData;
    const { intent, supplierAccessRequestInfo } = data;
    if (!supplierAccessRequestInfo) {
      return createJSONError(
        'There were no suppliers selected.',
        StatusCodes.BAD_REQUEST,
      );
    }
    switch (intent) {
      case INTENTS.APPROVE:
        return await updateSupplierAccessAction(
          supplierAccessRequestInfo,
          ACCESS_REQUEST_STATUS.APPROVED,
        );
      case INTENTS.REJECT:
        return await updateSupplierAccessAction(
          supplierAccessRequestInfo,
          ACCESS_REQUEST_STATUS.REJECTED,
        );
      default:
        return createJSONError(
          `Intent ${intent} not implemented`,
          StatusCodes.NOT_IMPLEMENTED,
        );
    }
  } catch (error) {
    logError(error, 'Action: Admin Route');
    return getRouteError('Failed to process request.', error);
  }
};

const Admin = () => {
  const data = useLoaderData<
    typeof loader
  >() as GetSupplierAccessRequestJSONProps[];
  const actionData = useActionData<typeof action>();

  const resourceName = {
    singular: 'Supplier Request',
    plural: 'Supplier Requests',
  };
  const submit = useSubmit();
  const shopify = useAppBridge();
  const [requestsData, setRequestsData] = useState(data);
  const [filteredData, setFilteredData] = useState(data);
  const [selected, setSelected] = useState(0);
  const { mode, setMode } = useSetIndexFiltersMode();
  const [query, setQuery] = useState('');
  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  } = useIndexResourceState(filteredData);

  useEffect(() => {
    setFilteredData(() => {
      return requestsData.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase()),
      );
    });
  }, [query, requestsData]);

  useEffect(() => {
    if (!actionData) {
      return;
    }
    if (isActionDataError(actionData)) {
      shopify.toast.show(actionData.error.message, {
        isError: true,
      });
    } else if (isActionDataSuccess(actionData)) {
      shopify.toast.show(actionData.message);
    }
  }, [actionData, shopify]);

  useEffect(() => {
    setRequestsData(data);
    setFilteredData(() => {
      return data.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase()),
      );
    });
  }, [data, query]);

  const tabs: TabProps[] = useMemo(
    () => [
      {
        id: '0',
        content: 'All',
        onAction: () => {
          setRequestsData(data);
          setFilteredData(data);
          setSelected(0);
          clearSelection();
        },
      },
      {
        id: '1',
        content: 'Pending',
        onAction: () => {
          const pendingData = data.filter(
            (item) => item.status === ACCESS_REQUEST_STATUS.PENDING,
          );
          setRequestsData(pendingData);
          setFilteredData(pendingData);
          setSelected(1);
          clearSelection();
        },
      },
      {
        id: '2',
        content: 'Approved',
        onAction: () => {
          const approvedData = data.filter(
            (item) => item.status === ACCESS_REQUEST_STATUS.APPROVED,
          );
          setRequestsData(approvedData);
          setFilteredData(approvedData);
          setSelected(2);
          clearSelection();
        },
      },
      {
        id: '3',
        content: 'Rejected',
        onAction: () => {
          const rejectedData = data.filter(
            (item) => item.status === ACCESS_REQUEST_STATUS.REJECTED,
          );
          setRequestsData(rejectedData);
          setFilteredData(rejectedData);
          setSelected(3);
          clearSelection();
        },
      },
    ],
    [data, clearSelection],
  );

  const headings: NonEmptyArray<IndexTableHeading> = [
    { title: 'Num' },
    { title: 'Date' },
    { title: 'Name' },
    { title: 'Contact Email' },
    { title: 'Website' },
    { title: 'Met Sales' },
    { title: 'Status' },
    { title: 'Updated At' },
  ];

  const handleFiltersQueryChange = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const clearQuery = useCallback(() => {
    setQuery('');
  }, []);

  const getSelectedSessionAndAccessIds = useCallback(() => {
    const selectedAccessRequestIdSet = new Set(selectedResources);
    const selectedSessionAndAccessIds: SupplierAccessRequestInfo[] = [];
    filteredData.forEach((data) => {
      const { sessionId, id } = data;
      if (selectedAccessRequestIdSet.has(id)) {
        selectedSessionAndAccessIds.push({
          supplierAccessRequestId: id,
          sessionId,
        });
      }
    });
    return selectedSessionAndAccessIds;
  }, [selectedResources, filteredData]);

  const approveSuppliers = useCallback(() => {
    const supplierAccessRequestInfo = getSelectedSessionAndAccessIds();
    submit(
      {
        intent: INTENTS.APPROVE,
        supplierAccessRequestInfo: JSON.stringify(supplierAccessRequestInfo),
      },
      { method: 'post' },
    );
  }, [getSelectedSessionAndAccessIds, submit]);

  const rejectSuppliers = useCallback(() => {
    const supplierAccessRequestInfo = getSelectedSessionAndAccessIds();
    submit(
      {
        intent: INTENTS.REJECT,
        supplierAccessRequestInfo: JSON.stringify(supplierAccessRequestInfo),
      },
      { method: 'post' },
    );
  }, [getSelectedSessionAndAccessIds, submit]);

  const promotedBulkActions: BulkActionsProps['promotedActions'] = [
    {
      content: 'Approve Suppliers',
      onAction: approveSuppliers,
    },
    {
      content: 'Reject Suppliers',
      onAction: rejectSuppliers,
    },
  ];

  return (
    <Page
      title="Admin Dashboard"
      subtitle="Approve or reject supplier requests."
    >
      <Card padding={'0'}>
        <IndexFilters
          tabs={tabs}
          mode={mode}
          canCreateNewView={false}
          setMode={setMode}
          filters={[]}
          queryValue={query}
          queryPlaceholder="Search by store name"
          onQueryChange={handleFiltersQueryChange}
          onQueryClear={clearQuery}
          onClearAll={() => {}}
          cancelAction={{
            onAction: () => {},
            disabled: false,
            loading: false,
          }}
          selected={selected}
          hideFilters
        />
        <IndexTable
          resourceName={resourceName}
          itemCount={filteredData.length}
          headings={headings}
          selectedItemsCount={
            allResourcesSelected ? 'All' : selectedResources.length
          }
          onSelectionChange={handleSelectionChange}
          promotedBulkActions={promotedBulkActions}
        >
          {filteredData.map((data, index) => (
            <Row
              key={data.id}
              data={data}
              index={index}
              selected={selectedResources.includes(data.id)}
            />
          ))}
        </IndexTable>
      </Card>
    </Page>
  );
};

const Row: FC<RowMarkupProps> = ({ data, index, selected }) => {
  const {
    id,
    createdAt,
    email,
    name,
    website,
    hasMetSalesThreshold,
    status,
    updatedAt,
    num,
  } = data;

  return (
    <IndexTable.Row id={id} key={id} selected={selected} position={index}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {num}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{convertToDate(createdAt)}</IndexTable.Cell>
      <IndexTable.Cell>{name}</IndexTable.Cell>
      <IndexTable.Cell>{email}</IndexTable.Cell>
      <IndexTable.Cell>
        <div
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Link
            url={website}
            target="_blank"
            accessibilityLabel="Shopify website"
          >
            Link
          </Link>
        </div>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {hasMetSalesThreshold ? 'True' : 'False'}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <StatusBadge status={status} />
      </IndexTable.Cell>
      <IndexTable.Cell>{convertToDate(updatedAt)}</IndexTable.Cell>
    </IndexTable.Row>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === ACCESS_REQUEST_STATUS.APPROVED) {
    return <Badge tone={'success'}>Approved</Badge>;
  } else if (status === ACCESS_REQUEST_STATUS.PENDING) {
    return <Badge tone={'attention'}>Pending</Badge>;
  } else if (status === ACCESS_REQUEST_STATUS.REJECTED) {
    return <Badge tone={'critical'}>Rejected</Badge>;
  }
  return <Badge tone={'critical'}>Error</Badge>;
};

export default Admin;
