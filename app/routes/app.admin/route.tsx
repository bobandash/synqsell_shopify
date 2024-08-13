import { json, type LoaderFunctionArgs } from "@remix-run/node";
// import { useLoaderData } from "@remix-run/react";
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
import logger from "logger";
import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import { ACCESS_REQUEST_STATUS, ROLES } from "~/constants";
import { hasRole } from "~/models/roles";
import { getAllSupplierAccessRequests } from "~/models/supplierAccessRequest";
import { authenticate } from "~/shopify.server";
import { getJSONError } from "~/util";

type RowMarkupProps = {
  data: {
    id: string;
    createdAt: string;
    name: string;
    website: string;
    metSalesThreshold: boolean;
    status: string;
    updatedAt: string;
  };
  index: number;
  selected: boolean;
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
    const supplierAccessRequests = await getAllSupplierAccessRequests(
      ACCESS_REQUEST_STATUS.PENDING,
    );
    return json(supplierAccessRequests, { status: StatusCodes.OK });
  } catch (error) {
    throw getJSONError(error, "admin network");
  }
};

const Admin = () => {
  const data = useMemo(
    () => [
      {
        id: "1020",
        createdAt: "Jul 20 at 4:34pm",
        date: "Jul 20 at 4:34pm",
        name: "BlankMod",
        website: "https://www.blankmod.com",
        metSalesThreshold: true,
        status: ACCESS_REQUEST_STATUS.APPROVED,
        updatedAt: "Jul 20 at 5:34pm",
      },
    ],
    [],
  );

  const resourceName = {
    singular: "Supplier Request",
    plural: "Supplier Requests",
  };

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
          itemCount={1}
          headings={headings}
          selectedItemsCount={
            allResourcesSelected ? "All" : selectedResources.length
          }
          onSelectionChange={handleSelectionChange}
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
  const { id, createdAt, name, website, metSalesThreshold, status, updatedAt } =
    data;

  return (
    <IndexTable.Row id={id} key={id} selected={selected} position={index}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {id}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{createdAt}</IndexTable.Cell>
      <IndexTable.Cell>{name}</IndexTable.Cell>
      <IndexTable.Cell>
        <a href={website} target="_blank" rel="noreferrer">
          {website}
        </a>
      </IndexTable.Cell>
      <IndexTable.Cell>{metSalesThreshold ? "True" : "False"}</IndexTable.Cell>
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
