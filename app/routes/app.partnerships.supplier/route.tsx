import { json, useLoaderData, useNavigate } from '@remix-run/react';
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
import { getJSONError } from '~/util';
import { authenticate } from '~/shopify.server';
import { StatusCodes } from 'http-status-codes';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { hasRole } from '~/services/models/roles';
import { ROLES } from '~/constants';
import { SUPPLIER_ACCESS_REQUEST_STATUS } from './constants';
import type { NonEmptyArray } from '@shopify/polaris/build/ts/src/types';
import type { IndexTableHeading } from '@shopify/polaris/build/ts/src/components/IndexTable';
import type { BulkActionsProps } from '@shopify/polaris/build/ts/src/components/BulkActions';
import type { RowData } from './types';
import { TableRow } from './components';
import getSupplierPartnershipInfo from './loader/getSupplierPartnershipInfo';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const {
      session: { id: sessionId },
    } = await authenticate.admin(request);
    const isRetailer = await hasRole(sessionId, ROLES.RETAILER);
    if (!isRetailer) {
      throw json(
        {
          message:
            'User is not retailer. Unauthorized to view supplier partnership requests.',
        },
        StatusCodes.UNAUTHORIZED,
      );
    }

    const supplierPartnershipInfo = await getSupplierPartnershipInfo(sessionId);

    return json(supplierPartnershipInfo, StatusCodes.OK);
  } catch (error) {
    console.error(error);
    throw getJSONError(error, 'supplier partnerships');
  }
};
// the whole point in supplier partnerships is if someone is on the retailer network and requests a partnership with you as a supplier
// and the whole point in supplier partnerships is if a supplier requests a partnership with you
const SupplierPartnerships = () => {
  const { isSupplier } = useRoleContext();
  const navigate = useNavigate();
  const data = useLoaderData<typeof loader>() as RowData[];

  const { mode, setMode } = useSetIndexFiltersMode();
  const [query, setQuery] = useState('');
  const [requestsData, setRequestsData] = useState<RowData[]>(data);
  const [filteredRequestsData, setFilteredData] = useState<RowData[]>(data);

  useEffect(() => {
    setRequestsData(data);
  }, [data]);

  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  } = useIndexResourceState(filteredRequestsData);

  const navigateRetailerRequests = useCallback(() => {
    navigate('/app/partnerships/retailer');
  }, [navigate]);
  const handleFiltersQueryChange = useCallback((value: string) => {
    setQuery(value);
  }, []);
  const clearQuery = useCallback(() => {
    setQuery('');
  }, []);
  const [selected, setSelected] = useState(0);

  // table constants
  const tabs: TabProps[] = useMemo(
    () => [
      {
        id: '0',
        content: 'All',
        onAction: () => {
          setSelected(0);
          setFilteredData(requestsData);
          clearSelection();
        },
      },
      {
        id: '1',
        content: 'Approved',
        onAction: () => {
          setSelected(1);
          setFilteredData(
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
          setFilteredData(
            requestsData.filter(
              (data) => data.status === SUPPLIER_ACCESS_REQUEST_STATUS.PENDING,
            ),
          );
          clearSelection();
        },
      },

      {
        id: '3',
        content: 'Rejected',
        onAction: () => {
          setSelected(3);
          setFilteredData(
            requestsData.filter(
              (data) => data.status === SUPPLIER_ACCESS_REQUEST_STATUS.REJECTED,
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
    { title: 'Status' },
  ];

  const promotedBulkActions: BulkActionsProps['promotedActions'] = [
    {
      content: 'Approve',
      onAction: () => {},
    },
    {
      content: 'Reject/Remove',
      onAction: () => {},
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
            />
          ))}
        </IndexTable>
      </Card>
    </Page>
  );
};

export default SupplierPartnerships;
