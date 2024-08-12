import { Layout, Page } from "@shopify/polaris";
import RetailerCard from "./_components/RetailerCard";

const RetailerNetwork = () => {
  return (
    <Page
      title="Retailer Network"
      subtitle="Discover potential retailers to partner with!"
    >
      <Layout>
        <Layout.Section variant="oneThird">
          <RetailerCard />
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <RetailerCard />
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default RetailerNetwork;
