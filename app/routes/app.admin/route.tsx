import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { useLoaderData, useLocation } from "@remix-run/react";
import {
  Badge,
  Card,
  IndexFilters,
  IndexTable,
  Page,
  type TabProps,
  Text,
  useIndexResourceState,
  useSetIndexFiltersMode,
} from "@shopify/polaris";
import type { IndexTableHeading } from "@shopify/polaris/build/ts/src/components/IndexTable";
import type { NonEmptyArray } from "@shopify/polaris/build/ts/src/types";
import createHttpError from "http-errors";
import { StatusCodes } from "http-status-codes";
import logger from "~/logger";
import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import { ACCESS_REQUEST_STATUS, ROLES } from "~/constants";
import { hasRole } from "~/models/roles";
import {
  getAllSupplierAccessRequests,
  type GetSupplierAccessRequestJSONProps,
} from "~/models/supplierAccessRequest";
import { authenticate } from "~/shopify.server";
import { getJSONError } from "~/util";
import { type BulkActionsProps } from "@shopify/polaris/build/ts/src/components/BulkActions";
import {
  type supplierAccessRequestInformationProps,
  updateSupplierAccess,
} from "~/models/transactions";
import { useAppBridge } from "@shopify/app-bridge-react";

type RowMarkupProps = {
  data: GetSupplierAccessRequestJSONProps;
  index: number;
  selected: boolean;
};

type ActionData = {
  intent: "approve" | "reject";
  supplierAccessRequestInfo: supplierAccessRequestInformationProps[];
};

const INTENTS = {
  APPROVE: "approve",
  REJECT: "reject",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const { id: sessionId } = session;
    const isAdmin = await hasRole(sessionId, ROLES.ADMIN);
    if (!isAdmin) {
      logger.error(`${sessionId} is not an admin.`);
      throw new createHttpError.Unauthorized("User is not an admin.");
    }
    const supplierAccessRequests = await getAllSupplierAccessRequests();
    return json(supplierAccessRequests);
  } catch (error) {
    throw getJSONError(error, "admin network");
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const data = (await request.json()) as ActionData;
    const { intent, supplierAccessRequestInfo } = data;
    if (!supplierAccessRequestInfo) {
      return json(
        { message: "There were no suppliers selected." },
        { status: StatusCodes.BAD_REQUEST },
      );
    }

    switch (intent) {
      case INTENTS.APPROVE:
        await updateSupplierAccess(
          supplierAccessRequestInfo,
          ACCESS_REQUEST_STATUS.APPROVED,
        );
        return json(
          { message: "Suppliers were successfully approved." },
          {
            status: 200,
          },
        );
      case INTENTS.REJECT:
        await updateSupplierAccess(
          supplierAccessRequestInfo,
          ACCESS_REQUEST_STATUS.REJECTED,
        );
        return json(
          { message: "Suppliers were successfully rejected." },
          { status: StatusCodes.OK },
        );
      default:
        return json(
          { message: "Invalid intent." },
          { status: StatusCodes.BAD_REQUEST },
        );
    }
  } catch (error) {
    throw getJSONError(error, "admin network");
  }
};

// !!! TODO: After MVP verification, add state management to change rejected and approved status
const Admin = () => {
  const data = useLoaderData<
    typeof loader
  >() as unknown as GetSupplierAccessRequestJSONProps[];
  const location = useLocation();
  const resourceName = {
    singular: "Supplier Request",
    plural: "Supplier Requests",
  };
  const shopify = useAppBridge();
  const [requestsData, setRequestsData] = useState(data);
  const [filteredData, setFilteredData] = useState(data);
  const [selected, setSelected] = useState(0);
  const { mode, setMode } = useSetIndexFiltersMode();
  const [query, setQuery] = useState("");
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

  const tabs: TabProps[] = useMemo(
    () => [
      {
        id: "0",
        content: "All",
        onAction: () => {
          setRequestsData(data);
          setFilteredData(data);
          setSelected(0);
          clearSelection();
        },
      },
      {
        id: "1",
        content: "Pending",
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
        id: "2",
        content: "Approved",
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
        id: "3",
        content: "Rejected",
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
    { title: "Request" },
    { title: "Date" },
    { title: "Name" },
    { title: "Email" },
    { title: "Website" },
    { title: "Met Sales" },
    { title: "Status" },
    { title: "Updated At" },
  ];

  const handleFiltersQueryChange = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const clearQuery = useCallback(() => {
    setQuery("");
  }, []);

  const getSelectedSessionAndAccessIds = useCallback(() => {
    const selectedAccessRequestIdSet = new Set(selectedResources);
    const selectedSessionAndAccessIds: supplierAccessRequestInformationProps[] =
      [];

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

  const approveSuppliers = useCallback(async () => {
    try {
      const supplierAccessRequestInfo = getSelectedSessionAndAccessIds();
      await fetch(location.pathname, {
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: INTENTS.APPROVE,
          supplierAccessRequestInfo,
        }),
      });
      shopify.toast.show("Successfully approved suppliers.");
    } catch (error) {
      console.error(error);
    }
  }, [getSelectedSessionAndAccessIds, location, shopify]);

  const rejectSuppliers = useCallback(async () => {
    try {
      const supplierAccessRequestInfo = getSelectedSessionAndAccessIds();
      await fetch(location.pathname, {
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: INTENTS.REJECT,
          supplierAccessRequestInfo,
        }),
      });
      shopify.toast.show("Successfully rejected suppliers.");
    } catch (error) {
      console.error(error);
    }
  }, [getSelectedSessionAndAccessIds, location, shopify]);

  const promotedBulkActions: BulkActionsProps["promotedActions"] = [
    {
      content: "Approve Suppliers",
      onAction: approveSuppliers,
    },
    {
      content: "Reject Suppliers",
      onAction: rejectSuppliers,
    },
  ];

  return (
    <Page
      title="Admin Dashboard"
      subtitle="Approve or reject supplier requests."
    >
      <Card padding={"0"}>
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
            allResourcesSelected ? "All" : selectedResources.length
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

// !!! TODO: FORMAT DATE PROPERLY
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
      <IndexTable.Cell>{createdAt}</IndexTable.Cell>
      <IndexTable.Cell>{name}</IndexTable.Cell>
      <IndexTable.Cell>{email}</IndexTable.Cell>
      <IndexTable.Cell>
        <a href={website} target="_blank" rel="noreferrer">
          {website}
        </a>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {hasMetSalesThreshold ? "True" : "False"}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <StatusBadge status={status} />
      </IndexTable.Cell>
      <IndexTable.Cell>{updatedAt}</IndexTable.Cell>
    </IndexTable.Row>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === ACCESS_REQUEST_STATUS.APPROVED) {
    return <Badge tone={"success"}>Approved</Badge>;
  } else if (status === ACCESS_REQUEST_STATUS.PENDING) {
    return <Badge tone={"attention"}>Pending</Badge>;
  } else if (status === ACCESS_REQUEST_STATUS.REJECTED) {
    return <Badge tone={"critical"}>Rejected</Badge>;
  }
  return <Badge tone={"critical"}>Error</Badge>;
};

export default Admin;
