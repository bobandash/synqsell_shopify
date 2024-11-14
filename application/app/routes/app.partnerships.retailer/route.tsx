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
  useNavigation,
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
import { hasRole } from '~/services/models/roles.server';
import { authenticate } from '~/shopify.server';
import {
  convertFormDataToObject,
  isActionDataError,
  isActionDataSuccess,
} from '~/lib/utils';
import { createJSONError, getRouteError, logError } from '~/lib/utils/server';
import { INTENTS, MODALS, RETAILER_ACCESS_REQUEST_STATUS } from './constants';
import {
  approveRetailersAction,
  changePermissionRetailersAction,
  rejectRemoveRetailersAction,
} from './actions';
import type {
  ApproveRetailersActionProps,
  ChangePermissionsRetailersAction,
  RejectRemoveRetailersActionProps,
} from './actions';
import type { PriceListJSON, RowData } from './types';
import { useAppBridge } from '@shopify/app-bridge-react';
import { useField, useForm } from '@shopify/react-form';
import { TableRow } from './components';
import type { NonEmptyArray } from '@shopify/polaris/build/ts/src/types';
import type { BulkActionsProps } from '@shopify/polaris/build/ts/src/components/BulkActions';
import type { IndexTableHeading } from '@shopify/polaris/build/ts/src/components/IndexTable';
import { ChangePermissionModal, MessageModal } from './components/Modals';
import { getAllPriceLists } from '~/services/models/priceList.server';
import { getSupplierPartnershipInfo } from './loader';
import createHttpError from 'http-errors';

type LoaderData = {
  partnershipInfo: RowData[];
  priceLists: PriceListJSON[];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const {
      session: { id: sessionId },
    } = await authenticate.admin(request);
    const isSupplier = await hasRole(sessionId, ROLES.SUPPLIER);
    if (!isSupplier) {
      throw new createHttpError.Unauthorized(
        'User is not a supplier. Unauthorized to view retailer partnership requests.',
      );
    }
    const [partnershipInfo, priceLists] = await Promise.all([
      getSupplierPartnershipInfo(sessionId),
      getAllPriceLists(sessionId),
    ]);
    return json({ partnershipInfo, priceLists }, { status: StatusCodes.OK });
  } catch (error) {
    logError(error, 'Loader: Retailer Partnerships');
    throw getRouteError('Failed to load retailer partnerships.', error);
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
      case INTENTS.CHANGE_PERMISSIONS:
        return await changePermissionRetailersAction(
          data as ChangePermissionsRetailersAction,
        );
    }
    return createJSONError(
      'Action not implemented. Please contact support.',
      StatusCodes.NOT_IMPLEMENTED,
    );
  } catch (error) {
    logError(error, 'Action: Retailer Partnerships');
    return getRouteError('Failed to process request.', error);
  }
};

const RetailerPartnerships = () => {
  const { partnershipInfo, priceLists } = useLoaderData<
    typeof loader
  >() as LoaderData;
  const actionData = useActionData<typeof action>();
  const { isSupplier } = useRoleContext();
  const navigate = useNavigate();
  const { mode, setMode } = useSetIndexFiltersMode();
  const [query, setQuery] = useState('');
  const [requestsData, setRequestsData] = useState<RowData[]>(partnershipInfo);
  const [filteredRequestsData, setFilteredRequestsData] =
    useState<RowData[]>(partnershipInfo);
  const [selectedPriceListIds, setSelectedPriceListIds] = useState<string[]>(
    [],
  );
  const [message, setMessage] = useState({ name: '', content: '' });
  const shopify = useAppBridge();
  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  } = useIndexResourceState(filteredRequestsData);
  const navigation = useNavigation();

  useEffect(() => {
    setRequestsData(partnershipInfo);
    setFilteredRequestsData(partnershipInfo);
  }, [partnershipInfo]);

  useEffect(() => {
    if (!actionData || navigation.state !== 'idle') {
      return;
    }
    if (isActionDataError(actionData)) {
      shopify.toast.show(actionData.error.message, {
        isError: true,
      });
    } else if (isActionDataSuccess(actionData)) {
      shopify.toast.show(actionData.message);
      clearSelection();
      setSelectedPriceListIds([]);
    }
  }, [actionData, navigation, clearSelection, shopify]);

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
  }, [query, requestsData]);

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

  // helper functions to get pending partnership requests
  const getSelectedPartnershipRequestIds = useCallback(
    (selectedPartnerships: string[]) => {
      const partnershipRequestIds = requestsData
        .filter((data) => {
          return (
            data.status === RETAILER_ACCESS_REQUEST_STATUS.PENDING &&
            selectedPartnerships.includes(data.id)
          );
        })
        .map((partnership) => partnership.id);
      return partnershipRequestIds;
    },
    [requestsData],
  );

  // helper functions to get approved partnerships
  const getSelectedPartnershipIds = useCallback(
    (selectedPartnerships: string[]) => {
      const pendingSelectedPartnershipIds = requestsData
        .filter((data) => {
          return (
            data.status === RETAILER_ACCESS_REQUEST_STATUS.APPROVED &&
            selectedPartnerships.includes(data.id)
          );
        })
        .map((partnership) => partnership.id);
      return pendingSelectedPartnershipIds;
    },
    [requestsData],
  );

  // Helper form to submit supplier partnerships
  const { submit: approveSupplierAction } = useForm({
    fields: {
      intent: useField(INTENTS.APPROVE_RETAILERS),
      selectedPartnerships: useField(selectedResources),
    },
    onSubmit: async (fieldValues) => {
      const { intent, selectedPartnerships } = fieldValues;
      // clean up selected partnerships data to only pending
      const selectedPartnershipRequestIds =
        getSelectedPartnershipRequestIds(selectedPartnerships);
      remixSubmit(
        {
          partnershipRequestIds: JSON.stringify(selectedPartnershipRequestIds),
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
      const partnershipRequestIds =
        getSelectedPartnershipRequestIds(selectedPartnerships);
      const partnershipIds = getSelectedPartnershipIds(selectedPartnerships);

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

  // helper form to change permissions (add/remove price lists) from retailers
  const { submit: changeRetailerPermissionsSubmit } = useForm({
    fields: {
      intent: useField(INTENTS.CHANGE_PERMISSIONS),
      selectedPartnerships: useField(selectedResources),
      selectedPriceListIds: useField(selectedPriceListIds),
    },
    onSubmit: async (fieldValues) => {
      const { intent, selectedPartnerships, selectedPriceListIds } =
        fieldValues;

      const partnershipIds = getSelectedPartnershipIds(selectedPartnerships);
      const partnershipRequestIds =
        getSelectedPartnershipRequestIds(selectedPartnerships);

      remixSubmit(
        {
          partnershipIds: JSON.stringify(partnershipIds),
          partnershipRequestIds: JSON.stringify(partnershipRequestIds),
          selectedPriceListIds: JSON.stringify(selectedPriceListIds),
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

  // for now, because you can select in bulk, I'll just make it into a new selection
  const openChangePermissionModal = useCallback(() => {
    shopify.modal.show(MODALS.CHANGE_PERMISSION);
  }, [shopify]);

  const promotedBulkActions: BulkActionsProps['promotedActions'] = [
    {
      content: 'Approve',
      onAction: approveSupplierAction,
    },
    {
      content: 'Remove',
      onAction: rejectRemoveSupplierAction,
    },
    {
      content: 'Change Permissions',
      onAction: openChangePermissionModal,
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
      <ChangePermissionModal
        priceLists={priceLists}
        setSelectedPriceListIds={setSelectedPriceListIds}
        selectedPriceListIds={selectedPriceListIds}
        changeRetailerPermissionsSubmit={changeRetailerPermissionsSubmit}
      />
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
