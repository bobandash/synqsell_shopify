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
import ChecklistTable from "~/routes/app._index/_components/ChecklistTable";
import { useCallback, useEffect, useState } from "react";
import { toggleChecklistVisibilitySchema } from "./schemas/checklistSchema";
import {
  createUserPreferences,
  hasUserPreferences,
  toggleChecklistVisibility,
} from "~/models/userPreferences";
import type {
  TransformedChecklistTableData,
  UserPreferenceData,
} from "~/models/types";
import { type InferType } from "yup";
import logger from "logger";
import { INTENTS, FETCHER_KEYS } from "./constants";
import throwError from "~/util/throwError";

type toggleChecklistVisibilityData = InferType<
  typeof toggleChecklistVisibilitySchema
>;

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
    const { session } = await authenticate.admin(request);
    const { shop } = session;
    let formData = await request.formData();
    const intent = formData.get("intent");
    switch (intent) {
      case INTENTS.TOGGLE_CHECKLIST_VISIBILITY:
        const data = {
          intent: intent,
          tableId: formData.get("tableId"),
        };
        await toggleChecklistVisibilitySchema.validate(data);
        const { tableId } = data as toggleChecklistVisibilityData;
        const newPreferences = await toggleChecklistVisibility(shop, tableId);
        return json(newPreferences);
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
  const [tables, setTables] =
    useState<TransformedChecklistTableData[]>(tablesData);
  // on client side, this wil refresh if user refreshes page
  const checklistVisibilityFetcher = useFetcher({
    key: FETCHER_KEYS.TOGGLE_CHECKLIST_VISIBILITY,
  });

  const updateTableVisibility = useCallback((tableIdsHidden: String[]) => {
    setTables((prev) =>
      prev.map((table) => ({
        ...table,
        isHidden: tableIdsHidden.includes(table.id),
      })),
    );
  }, []);

  useEffect(() => {
    const data = checklistVisibilityFetcher.data;
    if (data) {
      const userPreference = data as UserPreferenceData;
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
    <Page title="SynqSell" subtitle="Where Brand Partnerships Flourish">
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
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
