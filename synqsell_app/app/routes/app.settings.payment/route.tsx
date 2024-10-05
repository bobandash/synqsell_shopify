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
import {
  convertFormDataToObject,
  createJSONMessage,
  getJSONError,
} from '~/util';
import { FETCHER_KEYS, INTENTS } from './constants';
import {
  beginStripePaymentsOnboarding,
  finishStripeConnectOnboarding,
  finishStripePaymentsOnboarding,
  type BeginStripeOnboardingData,
} from './actions';
import { StatusCodes } from 'http-status-codes';
import { authenticate } from '~/shopify.server';
import { useRoleContext } from '~/context/RoleProvider';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { getProfile } from '~/services/models/userProfile';
import { hasRole } from '~/services/models/roles';
import { ROLES } from '~/constants';
import { handleStripeCustomerAccount } from './loader';
import type { BannerState } from './types';
import { PaddedBox } from '~/components';
import handleStripeConnectAccount from './loader/handleStripeConnectAccount';
import {
  PaymentForm,
  SuccessfulIntegration,
  TermsOfService,
} from './components';

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
    throw getJSONError(error, '/app/settings/payment');
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    let formData = await request.formData();
    const intent = formData.get('intent');
    const {
      session: { id: sessionId },
    } = await authenticate.admin(request);

    const formDataObject = convertFormDataToObject(formData);
    switch (intent) {
      case INTENTS.CREATE_STRIPE_PAYMENTS_ACCOUNT:
        const data = formDataObject as BeginStripeOnboardingFormData;
        return await beginStripePaymentsOnboarding(data.appBaseUrl);
      case INTENTS.FINISH_STRIPE_PAYMENTS_ONBOARDING:
        return await finishStripePaymentsOnboarding(sessionId);
      case INTENTS.FINISH_STRIPE_CONNECT_ONBOARDING:
        return await finishStripeConnectOnboarding(sessionId);
    }
    return createJSONMessage('Not Implemented', StatusCodes.NOT_IMPLEMENTED);
  } catch (error) {
    return getJSONError(error, '/app/settings/payment');
  }
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

  const finishOnboardingFetcher = useFetcher({
    key: FETCHER_KEYS.FINISH_STRIPE_ONBOARDING,
  });

  const handleFinishConnectOnboarding = useCallback(() => {
    finishOnboardingFetcher.submit(
      {
        intent: INTENTS.FINISH_STRIPE_PAYMENTS_ONBOARDING,
      },
      { method: 'POST' },
    );
  }, [finishOnboardingFetcher]);

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
        handleFinishConnectOnboarding();
      } else {
        // calls the return url but either onboarding was not complete / missing some details
        setSupplierPaymentBanner({
          tone: 'warning',
          text: 'Failed to completely onboard your supplier stripe connect account. Please try onboarding again.',
        });
      }
    }
  }, [
    searchParams,
    hasStripeConnectAccount,
    setSearchParams,
    handleFinishConnectOnboarding,
  ]);

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
  const beginStripePaymentsOnboardingFetcher = useFetcher({
    key: FETCHER_KEYS.CREATE_STRIPE_PAYMENTS_ACCOUNT,
  });

  const handleBeginPaymentsOnboarding = useCallback(() => {
    beginStripePaymentsOnboardingFetcher.submit(
      {
        intent: INTENTS.CREATE_STRIPE_PAYMENTS_ACCOUNT,
        appBaseUrl: appBaseUrl,
      },
      { method: 'POST' },
    );
  }, [beginStripePaymentsOnboardingFetcher, appBaseUrl]);

  useEffect(() => {
    if (
      beginStripePaymentsOnboardingFetcher.state == 'idle' &&
      beginStripePaymentsOnboardingFetcher.data
    ) {
      const data = beginStripePaymentsOnboardingFetcher.data;
      if (data) {
        const { onboardingUrl } = data as BeginStripeOnboardingData;
        setStripeOnboardingUrl(onboardingUrl);
      }
    }
    beginStripePaymentsOnboardingFetcher.data = undefined;
  }, [beginStripePaymentsOnboardingFetcher]);

  useEffect(() => {
    if (stripeOnboardingUrl) {
      open(stripeOnboardingUrl, '_top');
    }
  }, [stripeOnboardingUrl]);

  // handle stripe payments onboarding feedback

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
            <Card>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentForm
                  appBaseUrl={appBaseUrl}
                  setRetailerPaymentBanner={setRetailerPaymentBanner}
                  hasCustomerPaymentMethod={hasCustomerPaymentMethod}
                />
              </Elements>
            </Card>
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
                  onClick={handleBeginPaymentsOnboarding}
                  disabled={
                    beginStripePaymentsOnboardingFetcher.state === 'submitting'
                  }
                >
                  {beginStripePaymentsOnboardingFetcher.state === 'submitting'
                    ? 'Creating a connected account'
                    : 'Start Onboarding Process'}
                </Button>
              </Card>
            ) : (
              <Card>
                <SuccessfulIntegration text="Stripe Connect has been successfully integrated." />
              </Card>
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
