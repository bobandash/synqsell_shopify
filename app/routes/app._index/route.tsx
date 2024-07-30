import { Page, Layout, BlockStack } from "@shopify/polaris";

import { authenticate } from "~/shopify.server";
import { type LoaderFunctionArgs } from "@remix-run/node";
import Checklist, { type ChecklistProps } from "~/components/Checklist";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  // TODO: Decide how to fetch this information
  const retailerChecklist: ChecklistProps = {
    header: "Retailer Setup Guide",
    subheader:
      "Follow the steps below to import products from suppliers on our platform",
    tasks: [
      {
        id: 1,
        header: "Become a retailer",
        subheader:
          "Click get access to add Synqsell's functionality onto your store and start importing products from our supplier network.",
        isItemCompleted: true,
        isActive: true,
        button: {
          content: "Get Access",
          action: () => {},
        },
      },
      {
        id: 2,
        header: "Customize your brand profile",
        subheader:
          "Showcase the information you would like to display in the retailer network for suppliers to see.",
        isItemCompleted: false,
        isActive: false,
      },
      {
        id: 3,
        header: "Request a partnership with a supplier",
        subheader:
          "Partner with a supplier and get access to their price lists.",
        isItemCompleted: false,
        isActive: false,
      },
    ],
  };

  return (
    <Page title="SynqSell" subtitle="Where Brand Partnerships Flourish">
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Checklist checklist={retailerChecklist} />
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
