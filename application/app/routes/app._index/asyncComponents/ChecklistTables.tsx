import { useAsyncValue, useNavigate } from '@remix-run/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { RetailerModal } from '../components/Modals';
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
    hasStripeConnectAccount,
    hasStripePaymentMethod,
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

  const transformedTablesData = useMemo(() => {
    const getDisabledState = (
      index: number,
      isFirstCompleted: boolean,
      key: string,
    ) => {
      const isDisabledFromFirstItem =
        (index === 0 && isFirstCompleted) || (index > 0 && !isFirstCompleted);
      const isDisabledRetailerChecklist =
        !hasStripePaymentMethod &&
        (key === CHECKLIST_ITEM_KEYS.RETAILER_REQUEST_PARTNERSHIP ||
          key === CHECKLIST_ITEM_KEYS.RETAILER_IMPORT_PRODUCT);
      const isDisabledSupplierChecklist =
        !hasStripeConnectAccount &&
        key === CHECKLIST_ITEM_KEYS.SUPPLIER_EXPLORE_NETWORK;

      return (
        isDisabledFromFirstItem ||
        isDisabledRetailerChecklist ||
        isDisabledSupplierChecklist
      );
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
  }, [
    tablesData,
    shopify,
    navigate,
    hasStripePaymentMethod,
    hasStripeConnectAccount,
  ]);
  useEffect(() => {
    setTables(transformedTablesData);
  }, [transformedTablesData]);

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
