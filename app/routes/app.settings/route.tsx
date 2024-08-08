import {
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  Form,
  Layout,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import { ROLES } from "~/constants";
import { useRoleContext } from "~/context/RoleProvider";

const Settings = () => {
  const { roles } = useRoleContext();
  const isRetailer = roles.has(ROLES.RETAILER);
  const isSupplier = roles.has(ROLES.SUPPLIER);

  return (
    <Page
      title="Settings"
      primaryAction={<Button variant="primary">Save</Button>}
    >
      <Box paddingBlockEnd={"400"}>
        <Layout>
          <Layout.AnnotatedSection
            id="profile"
            title="Profile"
            description="Your profile is what is displayed on the retailer and supplier network for brands to view."
          >
            <Card>
              <Form onSubmit={() => {}}>
                <BlockStack gap={"200"}>
                  <TextField
                    label="Store name:"
                    value={"SynqSell"}
                    autoComplete="off"
                  />
                  <TextField
                    label="Contact Email:"
                    type="email"
                    value={"info@synqsell.com"}
                    autoComplete="email"
                  />
                  <TextField
                    label="Store Bio:"
                    value={""}
                    multiline={4}
                    autoComplete="off"
                    placeholder="Tell us a little bit about your brand and the products you sell."
                  />
                  <TextField
                    label="Products You’re Searching For:"
                    value={""}
                    multiline={4}
                    autoComplete="off"
                    placeholder={
                      "If you plan to use Synqsell as a retailer, let suppliers know what products you're searching for!"
                    }
                  />
                  <Box>
                    <div>
                      <Button variant={"primary"}>Save</Button>
                    </div>
                  </Box>
                </BlockStack>
              </Form>
            </Card>
          </Layout.AnnotatedSection>
          <Layout.AnnotatedSection
            id="profile_visibility"
            title="Profile Visibility"
            description="Decide whether or not to show/hide your brand on our networks."
          >
            <Card>
              <Form onSubmit={() => {}}>
                <BlockStack gap={"200"}>
                  <Checkbox
                    label="Visible on retailer network."
                    checked={true}
                  />
                  <Checkbox
                    label="Visible on supplier network (must at least have a general price list)."
                    checked={true}
                  />
                </BlockStack>
              </Form>
            </Card>
          </Layout.AnnotatedSection>
          <Layout.AnnotatedSection
            id="notifications"
            title="Notifications"
            description="Choose which notifications to receive to your inbox."
          >
            <Card>
              <Form onSubmit={() => {}}>
                <BlockStack gap={"200"}>
                  <Text as="h2" variant="bodyMd">
                    General Notifications
                  </Text>
                  <Checkbox
                    label="New incoming partnership requests."
                    checked={true}
                  />
                  <Text as="h2" variant="bodyMd">
                    Retailer Notifications
                  </Text>
                  <Checkbox
                    label="Updates to partnered suppliers, such as price changes and new products."
                    checked={true}
                  />
                  <Checkbox
                    label="New suppliers that joined SynqSell you might be interested in."
                    checked={true}
                  />
                  <Text as="h2" variant="bodyMd">
                    Supplier Notifications
                  </Text>
                  <Checkbox
                    label="New retailers that join SynqSell that you may be interested in partnering with."
                    checked={true}
                  />
                </BlockStack>
              </Form>
            </Card>
          </Layout.AnnotatedSection>
        </Layout>
      </Box>
    </Page>
  );
};

export default Settings;
