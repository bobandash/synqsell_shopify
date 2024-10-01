import {
  Banner,
  BlockStack,
  Button,
  Card,
  Layout,
  Page,
} from '@shopify/polaris';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useSearchParams,
} from '@remix-run/react';
import { getStripePublishableKey } from '~/services/stripe/stripeConnect';
import { convertFormDataToObject } from '~/util';
import { INTENTS } from './constants';
import {
  beginStripeOnboarding,
  type BeginStripeOnboardingData,
} from './actions';
import { StatusCodes } from 'http-status-codes';
import { authenticate } from '~/shopify.server';
import { useRoleContext } from '~/context/RoleProvider';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { getProfile } from '~/services/models/userProfile';
import PaymentForm from './components/PaymentForm';
import { hasRole } from '~/services/models/roles';
import { ROLES } from '~/constants';
import { handleStripeCustomerAccount } from './loader';
import type { BannerState } from './types';
import { PaddedBox } from '~/components';
import SuccessfulIntegration from './components/SuccessfulIntegration';
import TermsOfService from './components/TermsOfService';
import handleStripeConnectAccount from './loader/handleStripeConnectAccount';

type LoaderData = {
  userCurrency: string;
  appBaseUrl: string;
  stripePublishableKey: string;
  hasStripeConnectAccount: boolean;
  clientSecret: string | null;
  hasCustomerPaymentMethod: boolean;
};

type BeginStripeOnboardingFormData = {
  intent: string;
  appBaseUrl: string;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const {
      session: { id: sessionId, shop },
    } = await authenticate.admin(request);
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const appBaseUrl = `https://${shop}/admin/apps/synqsell/`;
    const accountId = searchParams.get('accountId');
    const [profile, isRetailer, isSupplier] = await Promise.all([
      getProfile(sessionId),
      hasRole(sessionId, ROLES.RETAILER),
      hasRole(sessionId, ROLES.SUPPLIER),
    ]);
    const userCurrency = profile.currencyCode;

    const [
      { clientSecret, hasCustomerPaymentMethod },
      { hasStripeConnectAccount },
    ] = await Promise.all([
      handleStripeCustomerAccount(isRetailer, sessionId),
      handleStripeConnectAccount(isSupplier, sessionId, accountId),
    ]);

    const stripePublishableKey = getStripePublishableKey();
    return json({
      userCurrency,
      clientSecret,
      appBaseUrl, // base url w/out any paths
      stripePublishableKey,
      hasStripeConnectAccount,
      hasCustomerPaymentMethod,
    });
  } catch (error) {
    console.error(error);
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
    case INTENTS.CREATE_PAYMENT_SOURCE:
      break;
  }
  return json({ data: 'Not Implemented' }, StatusCodes.NOT_IMPLEMENTED);
};

const PaymentSettings = () => {
  const navigate = useNavigate();
  const { isRetailer, isSupplier } = useRoleContext();
  const {
    appBaseUrl,
    hasStripeConnectAccount,
    stripePublishableKey,
    clientSecret,
    hasCustomerPaymentMethod,
  } = useLoaderData<typeof loader>() as LoaderData;
  const [stripeOnboardingUrl, setStripeOnboardingUrl] = useState<string>('');
  const [retailerPaymentBanner, setRetailerPaymentBanner] =
    useState<BannerState>({ text: '', tone: 'undefined' });
  const [supplierPaymentBanner, setSupplierPaymentBanner] =
    useState<BannerState>({ text: '', tone: 'undefined' });
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const accountId = searchParams.get('accountId');
    if (accountId) {
      if (hasStripeConnectAccount) {
        setSupplierPaymentBanner({
          tone: 'success',
          text: 'Success! Your supplier stripe connect account has been saved',
        });
        setSearchParams((prev) => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('accountId');
          return newParams;
        });
      } else {
        // calls the return url but either onboarding was not complete / missing some details
        setSupplierPaymentBanner({
          tone: 'warning',
          text: 'Failed to completely onboard your supplier stripe connect account. Please try onboarding again.',
        });
      }
    }
  }, [searchParams, hasStripeConnectAccount, setSearchParams]);

  const dismissRetailerPaymentBanner = useCallback(() => {
    setRetailerPaymentBanner({
      text: '',
      tone: 'undefined',
    });
  }, []);

  const dismissSupplierPaymentBanner = useCallback(() => {
    setSupplierPaymentBanner({
      text: '',
      tone: 'undefined',
    });
  }, []);

  const navigateUserSettings = useCallback(() => {
    navigate('/app/settings/user');
  }, [navigate]);
  const stripePromise = useMemo(() => {
    return loadStripe(stripePublishableKey);
  }, [stripePublishableKey]);

  // form fetcher for handling stripe connect onboarding
  const beginStripeOnboardingFetcher = useFetcher({
    key: INTENTS.CREATE_ACCOUNT,
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
      {(retailerPaymentBanner.text || supplierPaymentBanner.text) && (
        <BlockStack gap="200">
          {retailerPaymentBanner.text &&
            retailerPaymentBanner.tone !== 'undefined' && (
              <Banner
                title="Retailer Payment Method"
                tone={retailerPaymentBanner.tone}
                onDismiss={dismissRetailerPaymentBanner}
              >
                <p>{retailerPaymentBanner.text}</p>
              </Banner>
            )}
          {supplierPaymentBanner.text &&
            supplierPaymentBanner.tone !== 'undefined' && (
              <Banner
                title="Retailer Payment Method"
                tone={supplierPaymentBanner.tone}
                onDismiss={dismissSupplierPaymentBanner}
              >
                <p>{supplierPaymentBanner.text}</p>
              </Banner>
            )}
          <PaddedBox />
        </BlockStack>
      )}

      <Layout>
        {isRetailer && clientSecret && (
          <Layout.AnnotatedSection
            id="retailerPaymentMethod"
            title="Payment Method (Retailer)"
            description="Add a payment method to securely pay suppliers with Stripe."
          >
            {hasCustomerPaymentMethod ? (
              <SuccessfulIntegration text="Payment method was successfully added." />
            ) : (
              <Card>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <PaymentForm
                    appBaseUrl={appBaseUrl}
                    setRetailerPaymentBanner={setRetailerPaymentBanner}
                  />
                </Elements>
              </Card>
            )}
          </Layout.AnnotatedSection>
        )}
        {isSupplier && (
          <Layout.AnnotatedSection
            id="supplierPaymentMethod"
            title="Receive Payments (Supplier)"
            description="Onboard with Stripe Connect to receive payments from retailers."
          >
            {!hasStripeConnectAccount ? (
              <Card>
                <Button
                  variant={'primary'}
                  onClick={handleBeginOnboarding}
                  disabled={beginStripeOnboardingFetcher.state === 'submitting'}
                >
                  {beginStripeOnboardingFetcher.state === 'submitting'
                    ? 'Creating a connected account'
                    : 'Start Onboarding Process'}
                </Button>
              </Card>
            ) : (
              <SuccessfulIntegration text="Stripe Connect has been successfully integrated." />
            )}
          </Layout.AnnotatedSection>
        )}
        <TermsOfService />
      </Layout>
      <PaddedBox />
      <PaddedBox />
    </Page>
  );
};

export default PaymentSettings;
