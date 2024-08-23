import { useAsyncValue, useFetcher, useNavigate } from "@remix-run/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FETCHER_KEYS, MODALS } from "../constants";
import { useAppBridge } from "@shopify/app-bridge-react";
import { RetailerModal } from "../components/Modals";
import type {
  ToggleChecklistVisibilityActionData,
  GetStartedRetailerActionData,
} from "../actions";
import { getChecklistBtnFunction, getChecklistItemId } from "../util";
import { useRoleContext } from "~/context/RoleProvider";
import { CHECKLIST_ITEM_KEYS } from "~/constants";
import SupplierModal from "../components/Modals/SupplierModal";
import type { TransformedChecklistTableData, LoaderResponse } from "../types";
import ChecklistTable from "../components/ChecklistTable";
import { BlockStack } from "@shopify/polaris";

function ChecklistTables() {
  const { tables: tablesData } = useAsyncValue() as unknown as LoaderResponse;

  const navigate = useNavigate();
  const shopify = useAppBridge();
  const [tables, setTables] =
    useState<TransformedChecklistTableData[]>(tablesData);
  const retailerGetStartedId = getChecklistItemId(
    CHECKLIST_ITEM_KEYS.RETAILER_GET_STARTED,
    tables,
  );
  const supplierGetStartedId = getChecklistItemId(
    CHECKLIST_ITEM_KEYS.SUPPLIER_GET_STARTED,
    tables,
  );

  const { addRole } = useRoleContext();

  // fetchers to get data from actions w/out refreshing the page
  const checklistVisibilityFetcher = useFetcher({
    key: FETCHER_KEYS.TOGGLE_CHECKLIST_VISIBILITY,
  });
  const becomeRetailerFetcher = useFetcher({
    key: FETCHER_KEYS.RETAILER_GET_STARTED,
  });
  const becomeSupplierFetcher = useFetcher({
    key: FETCHER_KEYS.SUPPLIER_GET_STARTED,
  });

  const transformedTablesData = useMemo(() => {
    return tablesData.map((table) => ({
      ...table,
      checklistItems: table.checklistItems.map(({ key, button, ...rest }) => ({
        key,
        ...rest,
        button: button
          ? {
              content: button.content,
              action: getChecklistBtnFunction(key, shopify, navigate),
            }
          : undefined,
      })),
    }));
  }, [tablesData, shopify, navigate]);

  useEffect(() => {
    setTables(transformedTablesData);
  }, [transformedTablesData]);

  // helper functions to optimistically render actions
  const updateTableVisibility = useCallback((tableIdsHidden: String[]) => {
    setTables((prev) =>
      prev.map((table) => ({
        ...table,
        isHidden: tableIdsHidden.includes(table.id),
      })),
    );
  }, []);

  const updateChecklistStatus = useCallback(
    (becomeRetailerData: GetStartedRetailerActionData) => {
      const { checklistStatus } = becomeRetailerData;
      setTables((prev) =>
        prev.map(({ checklistItems, ...table }) => {
          const updatedChecklistItems = checklistItems.map((item) => {
            const isUpdatedChecklistItem =
              item.id === checklistStatus.checklistItemId;
            return {
              ...item,
              isCompleted: isUpdatedChecklistItem
                ? checklistStatus.isCompleted
                : item.isCompleted,
            };
          });

          return {
            ...table,
            checklistItems: updatedChecklistItems,
          };
        }),
      );
    },
    [],
  );

  // render ui changes when form is completed
  // may need to decide whether or not to use formData to optimistically render UI in the future
  useEffect(() => {
    const data = checklistVisibilityFetcher.data;
    if (data) {
      const userPreference = data as ToggleChecklistVisibilityActionData;
      updateTableVisibility(userPreference.tableIdsHidden);
    }
  }, [checklistVisibilityFetcher.data, updateTableVisibility]);

  useEffect(() => {
    const data = becomeRetailerFetcher.data;
    if (data) {
      const becomeRetailerData =
        data as unknown as GetStartedRetailerActionData;
      updateChecklistStatus(becomeRetailerData);
      addRole(becomeRetailerData.role.name);
      shopify.modal.hide(MODALS.BECOME_RETAILER);
    }
  }, [becomeRetailerFetcher.data, updateChecklistStatus, shopify, addRole]);

  // !!!TODO: data persists on refresh
  useEffect(() => {
    const data = becomeSupplierFetcher.data;
    if (data) {
      shopify.modal.hide(MODALS.BECOME_SUPPLIER);
      shopify.toast.show(
        "Your request to become a supplier has been submitted. You will receive an email with the decision shortly.",
      );
    }
  }, [becomeSupplierFetcher.data, shopify]);

  const toggleActiveChecklistItem = useCallback(
    (checklistItemIndex: number, tableIndex: number) => {
      const activeChecklistItemIndex = tables[
        tableIndex
      ].checklistItems.findIndex((item) => item.isActive);
      const checklistItemsLength = tables[tableIndex].checklistItems.length;
      if (checklistItemIndex + 1 > checklistItemsLength) {
        return;
      }

      // render UI updates to table
      setTables((prev) => {
        const updatedTables = [...prev];
        const checklistItems = updatedTables[tableIndex].checklistItems;
        const newChecklistItems = checklistItems.map((item, index) => {
          if (index === checklistItemIndex) {
            return { ...item, isActive: !item.isActive };
          }
          if (index === activeChecklistItemIndex) {
            return { ...item, isActive: false };
          }
          return item;
        });
        updatedTables[tableIndex] = {
          ...updatedTables[tableIndex],
          checklistItems: newChecklistItems,
        };
        return updatedTables;
      });
    },
    [tables],
  );

  return (
    <BlockStack gap={"200"}>
      <RetailerModal checklistItemId={retailerGetStartedId} shopify={shopify} />
      <SupplierModal checklistItemId={supplierGetStartedId} shopify={shopify} />
      {tables &&
        tables.map((table, index) => (
          <ChecklistTable
            key={table.id}
            table={table}
            tableIndex={index}
            toggleActiveChecklistItem={toggleActiveChecklistItem}
          />
        ))}
    </BlockStack>
  );
}

export default ChecklistTables;
