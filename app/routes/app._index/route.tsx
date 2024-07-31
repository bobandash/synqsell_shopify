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
  const tables = useLoaderData<typeof loader>() as ChecklistTableProps[];
  return (
    <Page title="SynqSell" subtitle="Where Brand Partnerships Flourish">
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            {tables.map((table) => (
              <ChecklistTable key={table.id} checklist={table} />
            ))}
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
