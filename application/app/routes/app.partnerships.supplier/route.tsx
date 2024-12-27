import {
  json,
  useActionData,
  useLoaderData,
  useLocation,
  useNavigate,
  useSubmit as useRemixSubmit,
} from '@remix-run/react';
import {
  Card,
  IndexFilters,
  IndexTable,
  Page,
  useIndexResourceState,
  useSetIndexFiltersMode,
  type TabProps,
} from '@shopify/polaris';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRoleContext } from '~/context/RoleProvider';
import {
  convertFormDataToObject,
  isActionDataError,
  isActionDataSuccess,
} from '~/lib/utils';
import { createJSONError, getRouteError, logError } from '~/lib/utils/server';
import { authenticate } from '~/shopify.server';
import { StatusCodes } from 'http-status-codes';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { hasRole } from '~/services/models/roles.server';
import { ROLES } from '~/constants';
import { INTENTS, SUPPLIER_ACCESS_REQUEST_STATUS } from './constants';
import type { NonEmptyArray } from '@shopify/polaris/build/ts/src/types';
import type { IndexTableHeading } from '@shopify/polaris/build/ts/src/components/IndexTable';
import type { BulkActionsProps } from '@shopify/polaris/build/ts/src/components/BulkActions';
import type { RowData } from './types';
import { TableRow } from './components';
import getSupplierPartnershipInfo from './loader/getSupplierPartnershipInfo';
import MessageModal from './components/Modals/MessageModal';
import { useAppBridge } from '@shopify/app-bridge-react';
import { useField, useForm } from '@shopify/react-form';
import { approveSuppliersAction, rejectRemoveSuppliersAction } from './action';
import type {
  ApproveSuppliersActionProps,
  RejectRemoveSuppliersActionProps,
} from './action';
import createHttpError from 'http-errors';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const {
    session: { id: sessionId },
  } = await authenticate.admin(request);
  const isRetailer = await hasRole(sessionId, ROLES.RETAILER);
  if (!isRetailer) {
    throw new createHttpError.Unauthorized(
      'User is not retailer. Unauthorized to view supplier partnership requests.',
    );
  }
  const supplierPartnershipInfo = await getSupplierPartnershipInfo(sessionId);
  return json(supplierPartnershipInfo, StatusCodes.OK);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const formData = await request.formData();
    const intent = formData.get('intent');
    const data = convertFormDataToObject(formData);
    switch (intent) {
      case INTENTS.APPROVE_SUPPLIERS:
        return await approveSuppliersAction(
          data as ApproveSuppliersActionProps,
        );
      case INTENTS.REJECT_REMOVE_SUPPLIERS:
        return await rejectRemoveSuppliersAction(
          data as RejectRemoveSuppliersActionProps,
        );
      default:
        return createJSONError(
          `Intent ${intent} is invalid.`,
          StatusCodes.NOT_IMPLEMENTED,
        );
    }
  } catch (error) {
    logError(error);
    return getRouteError(
      error,
      'Failed to process request. Please try again later.',
    );
  }
};

// The whole point in supplier partnerships is when a supplier requests a partnership with you
const SupplierPartnerships = () => {
  const data = useLoaderData<typeof loader>() as RowData[];
  const actionData = useActionData<typeof action>();
  const { isSupplier } = useRoleContext();
  const navigate = useNavigate();
  const { mode, setMode } = useSetIndexFiltersMode();
  const [query, setQuery] = useState('');
  const [requestsData, setRequestsData] = useState<RowData[]>(data);
  const [filteredRequestsData, setFilteredRequestsData] =
    useState<RowData[]>(data);
  const [message, setMessage] = useState({ name: '', content: '' });
  const shopify = useAppBridge();
  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  } = useIndexResourceState(filteredRequestsData);

  useEffect(() => {
    setRequestsData(data);
    setFilteredRequestsData(data);
  }, [data]);

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
      clearSelection();
    }
  }, [actionData, shopify, clearSelection]);

  const navigateRetailerRequests = useCallback(() => {
    navigate('/app/partnerships/retailer');
  }, [navigate]);
  const handleFiltersQueryChange = useCallback((value: string) => {
    setQuery(value);
  }, []);

  useEffect(() => {
    setFilteredRequestsData(() => {
      return requestsData.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase()),
      );
    });
  }, [query, requestsData, data]);

  const clearQuery = useCallback(() => {
    setQuery('');
  }, []);
  const [selected, setSelected] = useState(0);
  const remixSubmit = useRemixSubmit();
  const { pathname } = useLocation();

  // table constants
  const tabs: TabProps[] = useMemo(
    () => [
      {
        id: '0',
        content: 'All',
        onAction: () => {
          setSelected(0);
          setFilteredRequestsData(requestsData);
          clearSelection();
        },
      },
      {
        id: '1',
        content: 'Approved',
        onAction: () => {
          setSelected(1);
          setFilteredRequestsData(
            requestsData.filter(
              (data) => data.status === SUPPLIER_ACCESS_REQUEST_STATUS.APPROVED,
            ),
          );
          clearSelection();
        },
      },
      {
        id: '2',
        content: 'Pending',
        onAction: () => {
          setSelected(2);
          setFilteredRequestsData(
            requestsData.filter(
              (data) => data.status === SUPPLIER_ACCESS_REQUEST_STATUS.PENDING,
            ),
          );
          clearSelection();
        },
      },
    ],
    [requestsData, clearSelection],
  );
  const resourceName = {
    singular: 'Supplier Partnership',
    plural: 'Supplier Partnerships',
  };
  const headings: NonEmptyArray<IndexTableHeading> = [
    { title: 'Request Date' },
    { title: 'Supplier' },
    { title: 'Price List(s)' },
    { title: 'Message' },
    { title: 'Status' },
  ];

  // Helper form to submit supplier partnerships
  const { submit: approveSupplierAction } = useForm({
    fields: {
      intent: useField(INTENTS.APPROVE_SUPPLIERS),
      selectedPartnerships: useField(selectedResources),
    },
    onSubmit: async (fieldValues) => {
      const { intent, selectedPartnerships } = fieldValues;
      // clean up selected partnerships data to only pending
      const pendingSelectedPartnershipIds = requestsData
        .filter((data) => {
          return (
            data.status === SUPPLIER_ACCESS_REQUEST_STATUS.PENDING &&
            selectedPartnerships.includes(data.id)
          );
        })
        .map((partnership) => partnership.id);
      remixSubmit(
        {
          partnershipRequestIds: JSON.stringify(pendingSelectedPartnershipIds),
          intent,
        },
        {
          method: 'post',
          action: pathname,
        },
      );
      return { status: 'success' };
    },
  });

  // helper form to reject / remove supplier partnerships
  const { submit: rejectRemoveSupplierAction } = useForm({
    fields: {
      intent: useField(INTENTS.REJECT_REMOVE_SUPPLIERS),
      selectedPartnerships: useField(selectedResources),
    },
    onSubmit: async (fieldValues) => {
      const { intent, selectedPartnerships } = fieldValues;
      // clean up selected partnerships data to only pending
      const partnershipRequestIds = requestsData
        .filter((data) => {
          return (
            data.status === SUPPLIER_ACCESS_REQUEST_STATUS.PENDING &&
            selectedPartnerships.includes(data.id)
          );
        })
        .map((partnership) => partnership.id);

      const partnershipIds = requestsData
        .filter((data) => {
          return (
            data.status === SUPPLIER_ACCESS_REQUEST_STATUS.APPROVED &&
            selectedPartnerships.includes(data.id)
          );
        })
        .map((partnership) => partnership.id);

      remixSubmit(
        {
          partnershipIds: JSON.stringify(partnershipIds),
          partnershipRequestIds: JSON.stringify(partnershipRequestIds),
          intent,
        },
        {
          method: 'post',
          action: pathname,
        },
      );
      return { status: 'success' };
    },
  });

  const promotedBulkActions: BulkActionsProps['promotedActions'] = [
    {
      content: 'Approve',
      onAction: approveSupplierAction,
    },
    {
      content: 'Reject/Remove',
      onAction: rejectRemoveSupplierAction,
    },
  ];

  return (
    <Page
      title="Supplier Partnerships"
      subtitle="Manage your current supplier partnerships and suppliers interested in partnering with you."
      primaryAction={{
        content: 'Retailer Requests',
        disabled: !isSupplier,
        helpText: 'Navigate to retailer partnership requests',
        onAction: navigateRetailerRequests,
      }}
    >
      <MessageModal message={message} shopify={shopify} />
      <Card padding={'0'}>
        <IndexFilters
          tabs={tabs}
          mode={mode}
          canCreateNewView={false}
          setMode={setMode}
          filters={[]}
          queryValue={query}
          queryPlaceholder="Search by supplier name"
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
          itemCount={filteredRequestsData.length}
          headings={headings}
          selectedItemsCount={
            allResourcesSelected ? 'All' : selectedResources.length
          }
          onSelectionChange={handleSelectionChange}
          promotedBulkActions={promotedBulkActions}
        >
          {filteredRequestsData.map((data, index) => (
            <TableRow
              key={data.id}
              data={data}
              index={index}
              selected={selectedResources.includes(data.id)}
              setMessage={setMessage}
            />
          ))}
        </IndexTable>
      </Card>
    </Page>
  );
};

export default SupplierPartnerships;
