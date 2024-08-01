import { Page, Layout, BlockStack } from "@shopify/polaris";

import { authenticate } from "~/shopify.server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  createMissingChecklistStatuses,
  getMissingChecklistIds,
  getTablesAndStatuses,
} from "~/models/checklistTable";
import { json, useLoaderData } from "@remix-run/react";
import type { ChecklistTableProps } from "~/routes/app._index/_components/ChecklistTable";
import ChecklistTable from "~/routes/app._index/_components/ChecklistTable";
import { useCallback, useState } from "react";
import { toggleChecklistVisibilitySchema } from "./schemas/checklistSchema";
import {
  createUserPreferences,
  hasUserPreferences,
  toggleChecklistVisibility,
} from "~/models/userPreferences";
import { type InferType } from "yup";

type toggleChecklistVisibilityData = InferType<
  typeof toggleChecklistVisibilitySchema
>;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // TODO: research generic error handlers in remix; I'm pretty sure this goes to the generic error handler if it fails
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
  return json(tables);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  let formData = await request.formData();
  const intent = formData.get("intent");

  // TODO: research generic error handlers in remix; I'm pretty sure this goes to the generic error handler if it fails
  switch (intent) {
    case "toggle_checklist_visibility":
      const data = {
        intent: intent,
        tableId: formData.get("tableId"),
      };
      const isValid = await toggleChecklistVisibilitySchema.isValid(data);
      if (isValid) {
        const { tableId } = data as toggleChecklistVisibilityData;
        const newPreferences = toggleChecklistVisibility(shop, tableId);
        return newPreferences;
      }
      break;
  }
};

export default function Index() {
  const tablesData = useLoaderData<typeof loader>() as ChecklistTableProps[];
  const [tables, setTables] = useState<ChecklistTableProps[]>(tablesData);

  // on client side, this wil refresh if user refreshes page
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
              {tables.map((table, index) => (
                <ChecklistTable
                  key={table.id}
                  checklist={table}
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
