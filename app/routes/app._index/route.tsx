import { Page, Layout, BlockStack } from "@shopify/polaris";

import { authenticate } from "~/shopify.server";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import {
  createMissingChecklistStatuses,
  getMissingChecklistIds,
  getTablesAndStatuses,
} from "~/models/checklistTable";
import { useLoaderData } from "@remix-run/react";
import type { ChecklistTableProps } from "~/components/ChecklistTable";
import ChecklistTable from "~/components/ChecklistTable";
import { useCallback, useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const missingChecklistIds = await getMissingChecklistIds(shop);
  if (missingChecklistIds) {
    await createMissingChecklistStatuses(missingChecklistIds, shop);
  }
  const tables = await getTablesAndStatuses(shop);
  return json(tables);
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

      // optimistically render tables
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
