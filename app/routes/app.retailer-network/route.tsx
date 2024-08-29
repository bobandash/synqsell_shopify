import { Layout, Page } from '@shopify/polaris';
import RetailerCard from './components/RetailerCard';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { getJSONError } from '~/util';
import { getVisibleRetailerProfiles } from '~/services/models/userProfile';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const visibleProfiles = await getVisibleRetailerProfiles(null, null, false);
    return json(visibleProfiles);
  } catch (error) {
    throw getJSONError(error, 'retailer network');
  }
};

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
