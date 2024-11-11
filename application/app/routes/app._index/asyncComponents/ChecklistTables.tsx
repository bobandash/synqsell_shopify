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
  const {
    tables: tablesData,
    hasStripeConnect,
    hasStripePayments,
  } = useAsyncValue() as LoaderResponse;

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
    const getDisabledState = (
      index: number,
      isFirstCompleted: boolean,
      key: string,
    ) => {
      if (
        (index === 0 && isFirstCompleted) ||
        (index > 0 && !isFirstCompleted)
      ) {
        return true;
      }

      // retailer checklist
      if (
        !hasStripePayments &&
        (key === CHECKLIST_ITEM_KEYS.RETAILER_REQUEST_PARTNERSHIP ||
          key === CHECKLIST_ITEM_KEYS.RETAILER_IMPORT_PRODUCT)
      ) {
        return true;
      }

      // supplier checklist
      if (
        !hasStripeConnect &&
        key === CHECKLIST_ITEM_KEYS.SUPPLIER_EXPLORE_NETWORK
      ) {
        return true;
      }

      return false;
    };

    return tablesData.map((table) => ({
      ...table,
      checklistItems: table.checklistItems.map(
        ({ key, button, ...rest }, index) => ({
          key,
          ...rest,
          button: button && {
            ...button,
            action: getChecklistBtnFunction(key, shopify, navigate),
            disabled: getDisabledState(
              index,
              table.checklistItems[0].isCompleted,
              key,
            ),
          },
        }),
      ),
    }));
  }, [tablesData, shopify, navigate, hasStripePayments, hasStripeConnect]);
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
