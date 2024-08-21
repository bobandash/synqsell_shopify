import {
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  Form,
  FormLayout,
  Layout,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import { ROLES } from "~/constants";
import { useRoleContext } from "~/context/RoleProvider";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import {
  useForm,
  useField,
  notEmpty,
  asChoiceField,
} from "@shopify/react-form";
import {
  getOrCreateProfile,
  hasProfile,
  type SocialMediaDataProps,
  type ProfileProps,
} from "~/models/userProfile";
import { convertFormDataToObject, getJSONError } from "~/util";
import { useLoaderData, useLocation } from "@remix-run/react";
import { isEmail } from "./util/customValidation";
import logger from "~/logger";
import styles from "~/shared.module.css";
import { useAppBridge } from "@shopify/app-bridge-react";
import { getRoles, type RolePropsJSON } from "~/models/roles";
import { useCallback, useState } from "react";
import { updateSettings } from "~/models/transactions";
import { ImageDropZone, type DropZoneImageFileProps } from "~/components";

type FormDataProps = {
  name: string;
  email: string;
  biography: string;
  desiredProducts: string;
  isVisibleRetailerNetwork: boolean;
  isVisibleSupplierNetwork: boolean;
  facebookLink: string;
  twitterLink: string;
  instagramLink: string;
  youtubeLink: string;
  tiktokLink: string;
};

type FormDataObjProps = {
  data: string;
};

type LoaderDataProps = {
  profile: ProfileProps;
  roles: RolePropsJSON[];
  socialMediaLinks: SocialMediaDataProps;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session, admin } = await authenticate.admin(request);
    const { id: sessionId } = session;
    const hasExistingProfile = await hasProfile(sessionId);
    const [profileWithSocialMediaLinks, roles] = await Promise.all([
      getOrCreateProfile(sessionId, admin.graphql),
      getRoles(sessionId),
    ]);
    const { SocialMediaLink: socialMediaLinks, ...profile } =
      profileWithSocialMediaLinks;

    return json(
      { profile, roles, socialMediaLinks },
      {
        status: hasExistingProfile ? 200 : 201,
      },
    );
  } catch (error) {
    throw getJSONError(error, "settings");
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const { id: sessionId } = session;

    // extract all important data
    const formData = await request.formData();
    const formDataObject = convertFormDataToObject(
      formData,
    ) as unknown as FormDataObjProps;
    const jsonData: FormDataProps = JSON.parse(formDataObject.data);
    const { name, email, biography, desiredProducts } = jsonData;
    const {
      facebookLink,
      twitterLink,
      instagramLink,
      youtubeLink,
      tiktokLink,
    } = jsonData;

    const socialMediaLinks = {
      facebook: facebookLink,
      twitter: twitterLink,
      instagram: instagramLink,
      youtube: youtubeLink,
      tiktok: tiktokLink,
    };

    const { isVisibleRetailerNetwork, isVisibleSupplierNetwork } = jsonData;
    const profileObj = {
      name,
      email,
      biography,
      desiredProducts,
    };
    const visibilityObj = {
      isVisibleRetailerNetwork,
      isVisibleSupplierNetwork,
    };

    await updateSettings(
      sessionId,
      profileObj,
      socialMediaLinks,
      visibilityObj,
    );
    return json("successfully saved");
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
      throw getJSONError(error, "settings");
    }
  }
};

const Settings = () => {
  const loaderData = useLoaderData<typeof loader>() as LoaderDataProps;
  const {
    profile: profileData,
    roles: rolesData,
    socialMediaLinks: socialMediaData,
  } = loaderData;

  const { isRetailer, isSupplier } = useRoleContext();
  const location = useLocation();
  const shopify = useAppBridge();
  const [logo, setLogo] = useState<DropZoneImageFileProps>(null);

  const isVisibleInNetwork = useCallback(
    (role: string, rolesData: RolePropsJSON[]) => {
      const isVisible =
        rolesData.findIndex(
          (roleData) => roleData.name === role && roleData.isVisibleInNetwork,
        ) >= 0;
      return isVisible;
    },
    [],
  );

  const { fields, submit } = useForm({
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
      desiredProducts: useField(profileData.desiredProducts || ""),
      isVisibleRetailerNetwork: useField(
        isVisibleInNetwork(ROLES.RETAILER, rolesData),
      ),
      isVisibleSupplierNetwork: useField(
        isVisibleInNetwork(ROLES.SUPPLIER, rolesData),
      ),
      facebookLink: useField({
        value: socialMediaData.facebook,
        validates: (value) => {
          if (value && !value.startsWith("https://www.facebook.com/")) {
            return "Link has to start with https://www.facebook.com/";
          }
        },
      }),
      twitterLink: useField({
        value: socialMediaData.twitter,
        validates: (value) => {
          if (value && !value.startsWith("https://twitter.com/")) {
            return "Link has to start with https://twitter.com/";
          }
        },
      }),
      instagramLink: useField({
        value: socialMediaData.instagram,
        validates: (value) => {
          if (value && !value.startsWith("https://www.instagram.com/")) {
            return "Link has to start with https://www.instagram.com/";
          }
        },
      }),
      youtubeLink: useField({
        value: socialMediaData.youtube,
        validates: (value) => {
          if (value && !value.startsWith("https://www.youtube.com/")) {
            return "Link has to start with https://www.youtube.com/";
          }
        },
      }),
      tiktokLink: useField({
        value: socialMediaData.tiktok,
        validates: (value) => {
          if (value && !value.startsWith("https://www.tiktok.com/@")) {
            return "Link has to start with https://www.tiktok.com/@";
          }
        },
      }),
    },
    onSubmit: async (fieldValues) => {
      try {
        const formData = new FormData();
        formData.append("data", JSON.stringify(fieldValues));
        await fetch(location.pathname, {
          body: formData,
          method: "post",
        });
        shopify.toast.show("Settings successfully saved");
        return { status: "success" };
      } catch {
        shopify.toast.show("Something went wrong. Please try again.");
        return { status: "success" };
      }
    },
  });

  return (
    <Form method="post" onSubmit={submit} action={location.pathname}>
      <Page
        title="Settings"
        primaryAction={
          <Button submit variant="primary">
            Save
          </Button>
        }
      >
        <Box paddingBlockEnd={"400"}>
          <Layout>
            <Layout.AnnotatedSection
              id="profile"
              title="Profile"
              description="Your profile is what is displayed on the retailer and supplier network for brands to view."
            >
              <Card>
                <FormLayout>
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
                  <ImageDropZone
                    file={logo}
                    setFile={setLogo}
                    label={"Logo (Recommended 400 x 400px):"}
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
                  <BlockStack gap={"150"}>
                    <Text as="p" variant="bodyMd">
                      Social Media Links
                    </Text>
                    <TextField
                      labelHidden
                      label="Facebook"
                      autoComplete="off"
                      placeholder={"https://www.facebook.com/"}
                      {...fields.facebookLink}
                    />
                    <TextField
                      labelHidden
                      label="Twitter"
                      autoComplete="off"
                      placeholder={"https://twitter.com/"}
                      {...fields.twitterLink}
                    />
                    <TextField
                      labelHidden
                      label="Instagram"
                      autoComplete="off"
                      placeholder={"https://www.instagram.com/"}
                      {...fields.instagramLink}
                    />
                    <TextField
                      labelHidden
                      label="Youtube"
                      autoComplete="off"
                      placeholder={"https://www.youtube.com/"}
                      {...fields.youtubeLink}
                    />
                    <TextField
                      labelHidden
                      label="TikTok"
                      autoComplete="off"
                      placeholder={"https://www.tiktok.com/@"}
                      {...fields.tiktokLink}
                    />
                  </BlockStack>
                </FormLayout>
              </Card>
            </Layout.AnnotatedSection>
            <Layout.AnnotatedSection
              id="notifications"
              title="Preferences"
              description="Decide your profile visibility."
            >
              <Card>
                <BlockStack gap={"200"}>
                  <Text as="h2" variant="headingSm">
                    Profile Visibility
                  </Text>
                  {isRetailer && (
                    <Checkbox
                      label="Visible on retailer network."
                      {...asChoiceField(fields.isVisibleRetailerNetwork)}
                    />
                  )}

                  {isSupplier && (
                    <Checkbox
                      label="Visible on supplier network (must at least have a general price list)."
                      checked={true}
                    />
                  )}
                  {/* // !!! TODO: add email preferences, not important for MVP */}
                  {/* <Text as="h2" variant="headingSm">
                    Email Notifications
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
                  )} */}
                </BlockStack>
              </Card>
            </Layout.AnnotatedSection>
          </Layout>
        </Box>
        <div className={styles["center-right"]}>
          <Button submit variant="primary">
            Save
          </Button>
        </div>
      </Page>
    </Form>
  );
};

export default Settings;
