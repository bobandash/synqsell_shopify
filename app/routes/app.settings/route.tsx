import {
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  Form,
  Layout,
  Page,
  PageActions,
  Text,
  TextField,
} from "@shopify/polaris";
import { ROLES } from "~/constants";
import { useRoleContext } from "~/context/RoleProvider";
import styles from "./styles.module.css";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { useForm, useField, notEmpty } from "@shopify/react-form";
import {
  getOrCreateProfile,
  hasProfile,
  type ProfileProps,
} from "~/models/profile";
import { getJSONError } from "~/util";
import { useLoaderData } from "@remix-run/react";
import { isEmail } from "./util/customValidation";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session, admin } = await authenticate.admin(request);
    const { id: sessionId } = session;
    const hasExistingProfile = await hasProfile(sessionId);
    const profile = await getOrCreateProfile(sessionId, admin.graphql);
    return json(profile, {
      status: hasExistingProfile ? 200 : 201,
    });
  } catch (error) {
    throw getJSONError(error, "settings");
  }
};

const Settings = () => {
  const profileData = useLoaderData<typeof loader>() as ProfileProps;
  const { roles } = useRoleContext();
  const isRetailer = roles.has(ROLES.RETAILER);
  const isSupplier = roles.has(ROLES.SUPPLIER);

  console.log(profileData);

  const { fields } = useForm({
    fields: {
      name: useField({
        value: profileData.name,
        validates: [notEmpty("Store name is required")],
      }),
      email: useField({
        value: profileData.email,
        validates: [
          notEmpty("Contact email is required"),
          isEmail("Contact email is not a valid email"),
        ],
      }),
      biography: useField({
        value: profileData.biography || "",
        validates: [notEmpty("Store bio cannot be empty")],
      }),
      desiredProducts: useField({
        value: profileData.desiredProducts || "",
        validates: [],
      }),
    },
  });

  return (
    <Page
      title="Settings"
      primaryAction={<Button variant="primary">Save</Button>}
    >
      <Box paddingBlockEnd={"400"}>
        <Form onSubmit={() => {}}>
          <Layout>
            <Layout.AnnotatedSection
              id="profile"
              title="Profile"
              description="Your profile is what is displayed on the retailer and supplier network for brands to view."
            >
              <Card>
                <BlockStack gap={"200"}>
                  <TextField
                    label="Store name:"
                    autoComplete="off"
                    {...fields.name}
                  />
                  <TextField
                    label="Contact Email:"
                    autoComplete="email"
                    {...fields.email}
                  />
                  <TextField
                    label="Store Bio:"
                    multiline={4}
                    autoComplete="off"
                    placeholder="Tell us a little bit about your brand and the products you sell."
                    {...fields.biography}
                  />
                  <TextField
                    label="Products You’re Searching For:"
                    multiline={4}
                    autoComplete="off"
                    placeholder={
                      "If you plan to use Synqsell as a retailer, let suppliers know what products you're searching for!"
                    }
                    {...fields.desiredProducts}
                  />
                  <Box>
                    <div className={styles["center-right"]}>
                      <Button variant={"primary"}>Preview</Button>
                    </div>
                  </Box>
                </BlockStack>
              </Card>
            </Layout.AnnotatedSection>
            <Layout.AnnotatedSection
              id="notifications"
              title="Preferences"
              description="Decide your profile visibility and notification settings."
            >
              <Card>
                <BlockStack gap={"200"}>
                  <Text as="h2" variant="headingSm">
                    Profile Visibility
                  </Text>
                  <Checkbox
                    label="Visible on retailer network."
                    checked={true}
                  />
                  {isSupplier && (
                    <Checkbox
                      label="Visible on supplier network (must at least have a general price list)."
                      checked={true}
                    />
                  )}
                  <Text as="h2" variant="headingSm">
                    General Notifications
                  </Text>

                  {isRetailer && (
                    <>
                      <Checkbox
                        label="New incoming partnership requests."
                        checked={true}
                      />
                      <Checkbox
                        label="Updates to partnered suppliers, such as price changes and new products."
                        checked={true}
                      />
                      <Checkbox
                        label="New suppliers that joined SynqSell you might be interested in."
                        checked={true}
                      />
                    </>
                  )}

                  {isSupplier && (
                    <Checkbox
                      label="New retailers that join SynqSell that you may be interested in partnering with."
                      checked={true}
                    />
                  )}
                </BlockStack>
              </Card>
            </Layout.AnnotatedSection>
          </Layout>
        </Form>
      </Box>
      <PageActions primaryAction={{ content: "Save" }} />
    </Page>
  );
};

export default Settings;
