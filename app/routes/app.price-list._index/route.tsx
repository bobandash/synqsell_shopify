import {
  BlockStack,
  Box,
  Card,
  IndexTable,
  Page,
  Text,
  useIndexResourceState,
} from "@shopify/polaris";
import { type BulkActionsProps } from "@shopify/polaris/build/ts/src/components/BulkActions";
import { type IndexTableHeading } from "@shopify/polaris/build/ts/src/components/IndexTable";
import { type NonEmptyArray } from "@shopify/polaris/build/ts/src/types";
import { ToolsIcon } from "~/assets";
import styles from "./styles.module.css";
import { useLocation, useNavigate } from "@remix-run/react";

const PriceList = () => {
  const data: string[] = [];
  const navigate = useNavigate();
  const location = useLocation();
  const headings: NonEmptyArray<IndexTableHeading> = [
    { title: "Name" },
    { title: "Type" },
    { title: "Retailers" },
    { title: "Units Sold" },
    { title: "Sales Generated" },
    { title: "Pricing Strategy" },
  ];

  const resourceName = {
    singular: "Price List",
    plural: "Price Lists",
  };

  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  } = useIndexResourceState(data);

  const promotedBulkActions: BulkActionsProps["promotedActions"] = [
    {
      content: "Approve Suppliers",
      onAction: () => {
        console.log("To-do: implement");
      },
    },
    {
      content: "Reject Suppliers",
      onAction: () => {
        console.log("To-do: implement");
      },
    },
  ];

  function navigateCreatePriceList() {
    const newPriceListRoute = [location.pathname, "new"].join("/");
    console.log(newPriceListRoute);
    navigate(newPriceListRoute);
  }

  return (
    <Page
      title="Price lists"
      subtitle="Create and edit price lists for retailers to import your products!"
      primaryAction={{
        content: "Create Price List",
        onAction: navigateCreatePriceList,
      }}
    >
      <Card padding={"0"}>
        <IndexTable
          resourceName={resourceName}
          itemCount={0}
          headings={headings}
          selectedItemsCount={
            allResourcesSelected ? "All" : selectedResources.length
          }
          onSelectionChange={handleSelectionChange}
          promotedBulkActions={promotedBulkActions}
          emptyState={<EmptyState />}
        ></IndexTable>
      </Card>
    </Page>
  );
};

const EmptyState = () => {
  return (
    <Box paddingBlock={"200"}>
      <BlockStack inlineAlign={"center"} gap={"300"}>
        <img
          src={ToolsIcon}
          alt="create price list icon"
          className={`${styles.icon}`}
        />
        <Text as="h2" variant="headingLg">
          Build Your Price List
        </Text>
        <Text as="p" variant={"bodyMd"}>
          Start inviting retailers to import your products today!
        </Text>
      </BlockStack>
    </Box>
  );
};

export default PriceList;
