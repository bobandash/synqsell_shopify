import {
  BlockStack,
  Button,
  Card,
  Form,
  Icon,
  InlineStack,
  Layout,
  Page,
  Text,
} from '@shopify/polaris';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useFetcher, useLoaderData, useNavigate } from '@remix-run/react';
import {
  getStripePublishableKey,
  isAccountOnboarded,
} from '~/services/stripe/onboarding';
import { convertFormDataToObject } from '~/util';
import { INTENTS } from './constants';
import {
  beginStripeOnboarding,
  type BeginStripeOnboardingData,
} from './actions';
import { StatusCodes } from 'http-status-codes';
import {
  addStripeAccount,
  userHasStripeAccount,
} from '~/services/models/stripeAccount';
import { authenticate } from '~/shopify.server';
import { CheckCircleIcon } from '@shopify/polaris-icons';
import { useRoleContext } from '~/context/RoleProvider';
import { Elements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

type LoaderData = {
  appBaseUrl: string;
  stripePublishableKey: string;
  hasStripeAccountInDb: boolean;
};

type BeginStripeOnboardingFormData = {
  intent: string;
  appBaseUrl: string;
};

type StripeMode = 'payment' | 'setup' | 'subscription';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const {
      session: { id: sessionId, shop },
    } = await authenticate.admin(request);
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const appBaseUrl = `https://${shop}/admin/apps/synqsell/`;
    const accountId = searchParams.get('accountId');
    const hasStripeAccountInDb = await userHasStripeAccount(sessionId);
    // when the user exits or completes the onboarding process with the return url
    if (accountId && !hasStripeAccountInDb) {
      const isStripeAccountOnboarded = await isAccountOnboarded(accountId);
      if (isStripeAccountOnboarded) {
        await addStripeAccount(sessionId, accountId);
      }
    }
    const stripePublishableKey = getStripePublishableKey();
    return json({
      appBaseUrl, // base url w/out any paths
      stripePublishableKey,
      hasStripeAccountInDb,
    });
  } catch (error) {
    throw json(error);
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  let formData = await request.formData();
  const intent = formData.get('intent');
  const formDataObject = convertFormDataToObject(formData);
  switch (intent) {
    case INTENTS.CREATE_ACCOUNT:
      const data = formDataObject as BeginStripeOnboardingFormData;
      return beginStripeOnboarding(data.appBaseUrl);
  }
  return json({ data: 'Not Implemented' }, StatusCodes.NOT_IMPLEMENTED);
};

const PaymentSettings = () => {
  const navigate = useNavigate();
  const { isRetailer, isSupplier } = useRoleContext();
  const { appBaseUrl, hasStripeAccountInDb, stripePublishableKey } =
    useLoaderData<typeof loader>() as LoaderData;
  const [stripeOnboardingUrl, setStripeOnboardingUrl] = useState<string>('');
  const navigateUserSettings = useCallback(() => {
    navigate('/app/settings/user');
  }, [navigate]);
  const stripePromise = useMemo(() => {
    return loadStripe(stripePublishableKey);
  }, [stripePublishableKey]);
  const options = {
    mode: 'payment' as StripeMode,
    amount: 1099,
    currency: 'usd',
  };

  // form fetcher for handling stripe connect onboarding
  const beginStripeOnboardingFetcher = useFetcher({
    key: INTENTS.CREATE_ACCOUNT,
  });
  const createPaymentSourceStripeFetcher = useFetcher({
    key: INTENTS.CREATE_PAYMENT_SOURCE,
  });

  const handleBeginOnboarding = useCallback(() => {
    beginStripeOnboardingFetcher.submit(
      { intent: INTENTS.CREATE_ACCOUNT, appBaseUrl: appBaseUrl },
      { method: 'POST' },
    );
  }, [beginStripeOnboardingFetcher, appBaseUrl]);

  useEffect(() => {
    if (
      beginStripeOnboardingFetcher.state == 'idle' &&
      beginStripeOnboardingFetcher.data
    ) {
      const data = beginStripeOnboardingFetcher.data;
      if (data) {
        const { onboardingUrl } = data as BeginStripeOnboardingData;
        setStripeOnboardingUrl(onboardingUrl);
      }
    }
    beginStripeOnboardingFetcher.data = undefined;
  }, [beginStripeOnboardingFetcher]);

  useEffect(() => {
    if (stripeOnboardingUrl) {
      open(stripeOnboardingUrl, '_top');
    }
  }, [stripeOnboardingUrl]);

  return (
    <Page
      title={'Payment Integrations'}
      subtitle="Add stripe integration to reliably disburse funds to suppliers if you're a retailer, or get paid as a retailer."
      primaryAction={{
        content: 'User Settings',
        helpText: 'Navigate to user profile settings.',
        onAction: navigateUserSettings,
      }}
    >
      <Layout>
        {isRetailer && (
          <Layout.AnnotatedSection
            id="retailerPaymentMethod"
            title="Payment Method (Retailer)"
            description="Add a payment method to securely pay suppliers with Stripe."
          >
            <Card>
              <Form onSubmit={() => {}}>
                <BlockStack gap="200">
                  <Elements stripe={stripePromise} options={options}>
                    <PaymentElement />
                  </Elements>
                  <InlineStack align="end">
                    <Button variant="primary">Add Payment Method</Button>
                  </InlineStack>
                </BlockStack>
              </Form>
            </Card>
          </Layout.AnnotatedSection>
        )}
        {isSupplier && (
          <Layout.AnnotatedSection
            id="supplierPaymentMethod"
            title="Stripe Connect (Supplier)"
            description="Onboard with stripe to receive payments."
          >
            {!hasStripeAccountInDb ? (
              <div>
                <Button
                  variant={'primary'}
                  onClick={handleBeginOnboarding}
                  disabled={beginStripeOnboardingFetcher.state === 'submitting'}
                >
                  {beginStripeOnboardingFetcher.state === 'submitting'
                    ? 'Creating a connected account'
                    : 'Start Onboarding Process'}
                </Button>
              </div>
            ) : (
              <Card>
                <InlineStack gap="100">
                  <div>
                    <Icon source={CheckCircleIcon} tone="base" />
                  </div>
                  <Text variant="bodyLg" as="h2">
                    Stripe Connect has been successfully integrated.
                  </Text>
                </InlineStack>
              </Card>
            )}
          </Layout.AnnotatedSection>
        )}
      </Layout>
    </Page>
  );
};

export default PaymentSettings;
