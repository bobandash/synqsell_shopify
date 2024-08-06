import { Page, Layout, BlockStack } from "@shopify/polaris";

import { authenticate } from "~/shopify.server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  createMissingChecklistStatuses,
  getMissingChecklistIds,
  getTablesAndStatuses,
} from "~/models/checklistTable";
import {
  isRouteErrorResponse,
  json,
  useFetcher,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import ChecklistTable from "~/routes/app._index/components/ChecklistTable";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createUserPreferences,
  hasUserPreferences,
} from "~/models/userPreferences";
import type { TransformedChecklistTableData } from "~/models/types";
import logger from "logger";
import {
  INTENTS,
  FETCHER_KEYS,
  CHECKLIST_ITEM_KEYS,
  MODALS,
} from "./constants";
import throwError from "~/util/throwError";
import { useAppBridge } from "@shopify/app-bridge-react";
import { RetailerModal } from "./components/Modals";
import type {
  ToggleChecklistVisibilityActionData,
  GetStartedRetailerActionData,
} from "./actions";
import {
  toggleChecklistVisibilityAction,
  getStartedRetailerAction,
} from "./actions";
import { convertFormDataToObject } from "~/util";
import { getChecklistBtnFunction, getChecklistItemId } from "./util";

// TODO: Fix logger information when receive best logging practices
export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const { shop } = session;
    const userPreferencesExist = await hasUserPreferences(shop);
    const missingChecklistIds = await getMissingChecklistIds(shop);
    if (missingChecklistIds) {
      await createMissingChecklistStatuses(missingChecklistIds, shop);
    }
    if (!userPreferencesExist) {
      await createUserPreferences(shop);
      logger.info("Successfully created user preferences");
    }
    const tables = await getTablesAndStatuses(shop);
    return json(tables, {
      status: 200,
    });
  } catch (error) {
    throwError(error, "index");
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session, admin } = await authenticate.admin(request);
    const { shop } = session;
    let formData = await request.formData();
    const intent = formData.get("intent");
    const formDataObject = convertFormDataToObject(formData);
    switch (intent) {
      case INTENTS.TOGGLE_CHECKLIST_VISIBILITY:
        return toggleChecklistVisibilityAction(formDataObject, shop);
      case INTENTS.RETAILER_GET_STARTED:
        return getStartedRetailerAction(admin.graphql, formDataObject, shop);
    }
  } catch (error) {
    logger.error(error);
  }

  return null;
};

function Index() {
  const tablesData = useLoaderData<
    typeof loader
  >() as TransformedChecklistTableData[];
  const shopify = useAppBridge();
  const [tables, setTables] =
    useState<TransformedChecklistTableData[]>(tablesData);
  const retailerGetStartedId = getChecklistItemId(
    CHECKLIST_ITEM_KEYS.RETAILER_GET_STARTED,
    tables,
  );

  // fetchers to get data from actions w/out refreshing the page
  const checklistVisibilityFetcher = useFetcher({
    key: FETCHER_KEYS.TOGGLE_CHECKLIST_VISIBILITY,
  });
  const becomeRetailerFetcher = useFetcher({
    key: FETCHER_KEYS.RETAILER_GET_STARTED,
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
              action: getChecklistBtnFunction(key, shopify),
            }
          : undefined,
      })),
    }));
  }, [tablesData, shopify]);

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
      const becomeRetailerData = data as GetStartedRetailerActionData;
      updateChecklistStatus(becomeRetailerData);
      shopify.modal.hide(MODALS.BECOME_RETAILER);
    }
  }, [becomeRetailerFetcher.data, updateChecklistStatus, shopify.modal]);

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
    <Page title="SynqSell" subtitle="Where Brand Partnerships Flourish">
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <RetailerModal
              checklistItemId={retailerGetStartedId}
              shopify={shopify}
            />
            <BlockStack gap={"200"}>
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
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>
          {error.status} {error.statusText}
        </h1>
        <p>{error.data}</p>
      </div>
    );
  } else if (error instanceof Error) {
    return (
      <div>
        <h1>Error</h1>
        <p>{error.message}</p>
        <p>The stack trace is:</p>
        <pre>{error.stack}</pre>
      </div>
    );
  } else {
    return <h1>Unknown Error</h1>;
  }
}

export default Index;
