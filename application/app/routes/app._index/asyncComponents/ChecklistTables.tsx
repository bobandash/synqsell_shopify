import { useAsyncValue, useFetcher, useNavigate } from '@remix-run/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FETCHER_KEYS } from '../constants';
import { useAppBridge } from '@shopify/app-bridge-react';
import { RetailerModal } from '../components/Modals';
import type { ToggleChecklistVisibilityActionData } from '../actions';
import { getChecklistBtnFunction, getChecklistItemId } from '../util';
import { CHECKLIST_ITEM_KEYS } from '~/constants';
import SupplierModal from '../components/Modals/SupplierModal';
import type { TransformedChecklistTableData, LoaderResponse } from '../types';
import ChecklistTable from '../components/ChecklistTable';
import { BlockStack } from '@shopify/polaris';

// TODO: add optimistic rendering
function ChecklistTables() {
  const { tables: tablesData } = useAsyncValue() as LoaderResponse;
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const [tables, setTables] =
    useState<TransformedChecklistTableData[]>(tablesData);

  useEffect(() => {
    setTables(tablesData);
  }, [tablesData]);

  const retailerGetStartedId = getChecklistItemId(
    CHECKLIST_ITEM_KEYS.RETAILER_GET_STARTED,
    tables,
  );
  const supplierGetStartedId = getChecklistItemId(
    CHECKLIST_ITEM_KEYS.SUPPLIER_GET_STARTED,
    tables,
  );

  // fetchers to get data from actions w/out refreshing the page
  const checklistVisibilityFetcher = useFetcher({
    key: FETCHER_KEYS.TOGGLE_CHECKLIST_VISIBILITY,
  });

  const transformedTablesData = useMemo(() => {
    return tablesData.map((table) => {
      const isFirstItemCompleted = table.checklistItems[0]
        ? table.checklistItems[0].isCompleted
        : false;
      return {
        ...table,
        checklistItems: table.checklistItems.map(
          ({ key, button, ...rest }, index) => {
            let disabled = false;
            // current checklist tables depend on brand being approved as a retailer and supplier
            // so if the brand is already a retailer or supplier, the 0-index button should be disabled
            // otherwise, if the brand is not a retailer or supplier, the remaining checklist items should be disabled
            if (index === 0 && isFirstItemCompleted) {
              disabled = true;
            } else if (index > 0 && !isFirstItemCompleted) {
              disabled = true;
            }
            return {
              key,
              ...rest,
              button: button
                ? {
                    content: button.content,
                    action: getChecklistBtnFunction(key, shopify, navigate),
                    disabled: disabled,
                  }
                : undefined,
            };
          },
        ),
      };
    });
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

  // render ui changes when form is completed
  // may need to decide whether or not to use formData to optimistically render UI in the future
  useEffect(() => {
    const data = checklistVisibilityFetcher.data;
    if (data) {
      const userPreference = data as ToggleChecklistVisibilityActionData;
      updateTableVisibility(userPreference.tableIdsHidden);
    }
  }, [checklistVisibilityFetcher.data, updateTableVisibility]);

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
    <BlockStack gap={'200'}>
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
