import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import {
  useActionData,
  useLoaderData,
  useLocation,
  useNavigate,
  useSubmit as useRemixSubmit,
} from '@remix-run/react';
import {
  Card,
  IndexFilters,
  Page,
  IndexTable,
  type TabProps,
  useIndexResourceState,
  useSetIndexFiltersMode,
} from '@shopify/polaris';
import { StatusCodes } from 'http-status-codes';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ROLES } from '~/constants';
import { useRoleContext } from '~/context/RoleProvider';
import { hasRole } from '~/services/models/roles';
import { authenticate } from '~/shopify.server';
import { convertFormDataToObject, getJSONError } from '~/util';
import getSupplierPartnershipInfo from './loader/getSupplierPartnershipInfo';
import { INTENTS, RETAILER_ACCESS_REQUEST_STATUS } from './constants';
import { approveRetailersAction, rejectRemoveRetailersAction } from './action';
import type {
  ApproveRetailersActionProps,
  RejectRemoveRetailersActionProps,
} from './action';
import type { RowData } from './types';
import { useAppBridge } from '@shopify/app-bridge-react';
import { useField, useForm } from '@shopify/react-form';
import { TableRow } from './components';
import MessageModal from './components/Modals/MessageModal';
import type { NonEmptyArray } from '@shopify/polaris/build/ts/src/types';
import type { BulkActionsProps } from '@shopify/polaris/build/ts/src/components/BulkActions';
import type { IndexTableHeading } from '@shopify/polaris/build/ts/src/components/IndexTable';
// !!! NOTE: Although most of the logic is similar to the supplier route, I decided not to combine both of them into a dynamic route
// !!! This is just in case suppliers and retailers have different needs in the future
export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const {
      session: { id: sessionId },
    } = await authenticate.admin(request);
    const isSupplier = await hasRole(sessionId, ROLES.SUPPLIER);
    if (!isSupplier) {
      throw json(
        {
          message:
            'User is not a supplier. Unauthorized to view retailer partnership requests.',
        },
        StatusCodes.UNAUTHORIZED,
      );
    }
    const retailerPartnershipInfo = await getSupplierPartnershipInfo(sessionId);
    return json(retailerPartnershipInfo, StatusCodes.OK);
  } catch (error) {
    throw getJSONError(error, 'retailer partnerships');
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const formData = await request.formData();
    const intent = formData.get('intent');
    const data = convertFormDataToObject(formData);
    switch (intent) {
      case INTENTS.APPROVE_RETAILERS:
        return await approveRetailersAction(
          data as ApproveRetailersActionProps,
        );
      case INTENTS.REJECT_REMOVE_RETAILERS:
        return await rejectRemoveRetailersAction(
          data as RejectRemoveRetailersActionProps,
        );
      default:
        return json(
          { message: 'Functionality has not been implemented yet.' },
          StatusCodes.NOT_IMPLEMENTED,
        );
    }
  } catch (error) {
    throw getJSONError(error, 'admin network');
  }
};

const RetailerPartnerships = () => {
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

  // TODO: handle bug where queries are reset when approve / reject suppliers
  useEffect(() => {
    setRequestsData(data);
    setFilteredRequestsData(data);
  }, [data]);

  useEffect(() => {
    if (actionData && 'message' in actionData) {
      shopify.toast.show(actionData.message);
      clearSelection();
    }
  }, [actionData, shopify, clearSelection]);

  const navigateSupplierRequests = useCallback(() => {
    navigate('/app/partnerships/supplier');
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
              (data) => data.status === RETAILER_ACCESS_REQUEST_STATUS.APPROVED,
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
              (data) => data.status === RETAILER_ACCESS_REQUEST_STATUS.PENDING,
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
      intent: useField(INTENTS.APPROVE_RETAILERS),
      selectedPartnerships: useField(selectedResources),
    },
    onSubmit: async (fieldValues) => {
      const { intent, selectedPartnerships } = fieldValues;
      // clean up selected partnerships data to only pending
      const pendingSelectedPartnershipIds = requestsData
        .filter((data) => {
          return (
            data.status === RETAILER_ACCESS_REQUEST_STATUS.PENDING &&
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
      intent: useField(INTENTS.REJECT_REMOVE_RETAILERS),
      selectedPartnerships: useField(selectedResources),
    },
    onSubmit: async (fieldValues) => {
      const { intent, selectedPartnerships } = fieldValues;
      // clean up selected partnerships data to only pending
      const partnershipRequestIds = requestsData
        .filter((data) => {
          return (
            data.status === RETAILER_ACCESS_REQUEST_STATUS.PENDING &&
            selectedPartnerships.includes(data.id)
          );
        })
        .map((partnership) => partnership.id);

      const partnershipIds = requestsData
        .filter((data) => {
          return (
            data.status === RETAILER_ACCESS_REQUEST_STATUS.APPROVED &&
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
      title="Retailer Partnerships"
      subtitle="Manage your current retailer partnerships and retailers interested in partnering with you."
      primaryAction={{
        content: 'Supplier Requests',
        disabled: !isSupplier,
        helpText: 'Navigate to supplier partnerships and requests',
        onAction: navigateSupplierRequests,
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

export default RetailerPartnerships;
