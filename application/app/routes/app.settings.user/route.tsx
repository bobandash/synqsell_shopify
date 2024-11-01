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
} from '@shopify/polaris';
import { ROLES } from '~/constants';
import { useRoleContext } from '~/context/RoleProvider';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { authenticate } from '~/shopify.server';
import {
  useForm,
  useField,
  notEmpty,
  asChoiceField,
} from '@shopify/react-form';
import {
  hasProfile,
  type SocialMediaDataProps,
  type ProfileProps,
  getProfile,
} from '~/services/models/userProfile';
import {
  convertFormDataToObject,
  isActionDataError,
  isActionDataSuccess,
} from '~/lib/utils';
import { createJSONSuccess, handleRouteError } from '~/lib/utils/server';
import {
  useActionData,
  useLoaderData,
  useLocation,
  useNavigate,
  useNavigation,
  useSubmit as useRemixSubmit,
} from '@remix-run/react';
import { isEmail } from './util/customValidation';
import styles from '~/shared.module.css';
import { useAppBridge } from '@shopify/app-bridge-react';
import { getRoles, type RolePropsJSON } from '~/services/models/roles';
import { useCallback, useEffect, useState } from 'react';
import { updateSettings } from '~/services/transactions';
import {
  ImageDropZone,
  PaddedBox,
  type DropZoneImageFileProps,
} from '~/components';
import { uploadFile } from '~/services/aws/s3';
import { StatusCodes } from 'http-status-codes';

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

type FormDataWithLogo = {
  data: FormDataProps;
  logo?: File;
};

type LoaderDataProps = {
  profile: ProfileProps;
  roles: RolePropsJSON[];
  socialMediaLinks: SocialMediaDataProps;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const { id: sessionId } = session;
    const hasExistingProfile = await hasProfile(sessionId);
    const [profileWithSocialMediaLinks, roles] = await Promise.all([
      getProfile(sessionId),
      getRoles(sessionId),
    ]);
    const { socialMediaLink: socialMediaLinks, ...profile } =
      profileWithSocialMediaLinks;

    return json(
      { profile, roles, socialMediaLinks },
      {
        status: hasExistingProfile ? 200 : 201,
      },
    );
  } catch (error) {
    throw handleRouteError(error, 'settings');
  }
};
// TODO: Refactor social social media model to be more flexible so you don't have to destructure props in future
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const { id: sessionId } = session;

    // extract all important data
    const formData = await request.formData();
    const formDataObject = convertFormDataToObject(
      formData,
    ) as unknown as FormDataWithLogo;
    const dataBesidesLogo = formDataObject.data;
    const logo = formDataObject.logo ?? null;
    const logoUrl = logo ? await uploadFile(logo) : null;

    const { name, email, biography, desiredProducts } = dataBesidesLogo;
    const {
      facebookLink,
      twitterLink,
      instagramLink,
      youtubeLink,
      tiktokLink,
    } = dataBesidesLogo;

    const socialMediaLinks = {
      facebook: facebookLink,
      twitter: twitterLink,
      instagram: instagramLink,
      youtube: youtubeLink,
      tiktok: tiktokLink,
    };

    const { isVisibleRetailerNetwork, isVisibleSupplierNetwork } =
      dataBesidesLogo;
    const profileObj = {
      name,
      email,
      biography,
      desiredProducts,
      logoUrl,
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

    return createJSONSuccess(
      'Successfully updated user settings.',
      StatusCodes.OK,
    );
  } catch (error) {
    throw handleRouteError(error, '/app/settings/user');
  }
};

const UserSettings = () => {
  const loaderData = useLoaderData<typeof loader>() as LoaderDataProps;
  const actionData = useActionData<typeof action>();
  const {
    profile: profileData,
    roles: rolesData,
    socialMediaLinks: socialMediaData,
  } = loaderData;
  const transition = useNavigation();
  const isSubmitting = transition.state === 'submitting';

  const { isRetailer, isSupplier } = useRoleContext();
  const location = useLocation();
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const [logo, setLogo] = useState<DropZoneImageFileProps>(
    profileData.logo ? { url: profileData.logo, altText: 'Logo' } : null,
  );
  const remixSubmit = useRemixSubmit();

  useEffect(() => {
    if (!actionData) {
      return;
    }

    if (isActionDataError(actionData)) {
      shopify.toast.show(actionData.error.message, { isError: true });
    } else if (isActionDataSuccess(actionData)) {
      shopify.toast.show(actionData.message);
    }
  }, [actionData, shopify]);

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
        validates: [notEmpty('Store name is required')],
      }),
      email: useField({
        value: profileData.email,
        validates: [
          notEmpty('Contact email is required'),
          isEmail('Contact email is not a valid email'),
        ],
      }),
      biography: useField({
        value: profileData.biography || '',
        validates: [notEmpty('Store bio cannot be empty')],
      }),
      desiredProducts: useField(profileData.desiredProducts || ''),
      isVisibleRetailerNetwork: useField(
        isVisibleInNetwork(ROLES.RETAILER, rolesData),
      ),
      isVisibleSupplierNetwork: useField(
        isVisibleInNetwork(ROLES.SUPPLIER, rolesData),
      ),
      facebookLink: useField({
        value: socialMediaData.facebook,
        validates: (value) => {
          if (value && !value.startsWith('https://www.facebook.com/')) {
            return 'Link has to start with https://www.facebook.com/';
          }
        },
      }),
      twitterLink: useField({
        value: socialMediaData.twitter,
        validates: (value) => {
          if (value && !value.startsWith('https://twitter.com/')) {
            return 'Link has to start with https://twitter.com/';
          }
        },
      }),
      instagramLink: useField({
        value: socialMediaData.instagram,
        validates: (value) => {
          if (value && !value.startsWith('https://www.instagram.com/')) {
            return 'Link has to start with https://www.instagram.com/';
          }
        },
      }),
      youtubeLink: useField({
        value: socialMediaData.youtube,
        validates: (value) => {
          if (value && !value.startsWith('https://www.youtube.com/')) {
            return 'Link has to start with https://www.youtube.com/';
          }
        },
      }),
      tiktokLink: useField({
        value: socialMediaData.tiktok,
        validates: (value) => {
          if (value && !value.startsWith('https://www.tiktok.com/@')) {
            return 'Link has to start with https://www.tiktok.com/@';
          }
        },
      }),
    },
    onSubmit: async (fieldValues) => {
      const formData = new FormData();
      formData.append('data', JSON.stringify(fieldValues));
      if (logo && logo instanceof File) {
        formData.append('logo', logo);
      }
      remixSubmit(formData, {
        method: 'post',
        encType: 'multipart/form-data',
      });
      return { status: 'success' };
    },
  });

  const navigatePaymentSettings = useCallback(() => {
    navigate('/app/settings/payment');
  }, [navigate]);

  return (
    <Page
      title="Settings"
      primaryAction={{
        content: 'Payment Integration',
        helpText: 'Navigate to stripe integration.',
        onAction: navigatePaymentSettings,
      }}
    >
      <Form method="post" onSubmit={submit} action={location.pathname}>
        <Box paddingBlockEnd={'400'}>
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
                    label={'Logo (Recommended: 400x400 px):'}
                  />
                  <TextField
                    label="Products You’re Searching For:"
                    multiline={4}
                    autoComplete="off"
                    placeholder={
                      "If you plan to use SynqSell as a retailer, let suppliers know what products you're searching for!"
                    }
                    {...fields.desiredProducts}
                  />
                  <BlockStack gap={'150'}>
                    <Text as="p" variant="bodyMd">
                      Social Media Links
                    </Text>
                    <TextField
                      labelHidden
                      label="Facebook"
                      autoComplete="off"
                      placeholder={'https://www.facebook.com/'}
                      {...fields.facebookLink}
                    />
                    <TextField
                      labelHidden
                      label="Twitter"
                      autoComplete="off"
                      placeholder={'https://twitter.com/'}
                      {...fields.twitterLink}
                    />
                    <TextField
                      labelHidden
                      label="Instagram"
                      autoComplete="off"
                      placeholder={'https://www.instagram.com/'}
                      {...fields.instagramLink}
                    />
                    <TextField
                      labelHidden
                      label="Youtube"
                      autoComplete="off"
                      placeholder={'https://www.youtube.com/'}
                      {...fields.youtubeLink}
                    />
                    <TextField
                      labelHidden
                      label="TikTok"
                      autoComplete="off"
                      placeholder={'https://www.tiktok.com/@'}
                      {...fields.tiktokLink}
                    />
                  </BlockStack>
                </FormLayout>
              </Card>
            </Layout.AnnotatedSection>
            <Layout.AnnotatedSection
              id="preferences"
              title="Preferences"
              description="Decide your profile visibility."
            >
              <Card>
                <BlockStack gap={'200'}>
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
                      {...asChoiceField(fields.isVisibleSupplierNetwork)}
                    />
                  )}
                </BlockStack>
              </Card>
            </Layout.AnnotatedSection>
          </Layout>
        </Box>
        <div className={styles['center-right']}>
          <Button submit variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving' : 'Save'}
          </Button>
        </div>
        <PaddedBox />
      </Form>
    </Page>
  );
};

export default UserSettings;
