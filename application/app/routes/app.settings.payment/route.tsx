import { Banner, BlockStack, Card, Layout, Page } from '@shopify/polaris';
import { useCallback, useMemo, useState } from 'react';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { getStripePublishableKey } from '~/services/stripe/stripeConnect';
import { convertFormDataToObject } from '~/lib/utils';
import {
  createJSONError,
  getAppBaseUrl,
  getRouteError,
  logError,
} from '~/lib/utils/server';
import { INTENTS } from './constants';
import {
  beginStripeConnectOnboarding,
  finishStripeConnectOnboarding,
  finishStripeCustomerOnboarding,
} from './actions';
import { StatusCodes } from 'http-status-codes';
import { authenticate } from '~/shopify.server';
import { useRoleContext } from '~/context/RoleProvider';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { hasRole } from '~/services/models/roles.server';
import { ROLES } from '~/constants';
import { handleStripeCustomerAccount } from './loader';
import type { BannerState } from './types';
import { PaddedBox } from '~/components';
import {
  PaymentForm,
  StripeConnectOnboarding,
  TermsOfService,
} from './components';
import { userHasStripeConnectAccount } from '~/services/models/stripeConnectAccount.server';

type LoaderData = {
  userCurrency: string;
  appBaseUrl: string;
  stripePublishableKey: string;
  hasStripeConnectAccount: boolean;
  clientSecret: string | null;
  hasPaymentMethod: boolean;
};

type BeginStripeOnboardingFormData = {
  intent: string;
  appBaseUrl: string;
};

type FinishStripeAccountOnboardingFormData = {
  intent: string;
  accountId: string;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const {
    session: { id: sessionId, shop },
  } = await authenticate.admin(request);
  const appBaseUrl = getAppBaseUrl(shop);
  const [isRetailer] = await Promise.all([
    hasRole(sessionId, ROLES.RETAILER),
    hasRole(sessionId, ROLES.SUPPLIER),
  ]);

  const [{ clientSecret, hasPaymentMethod }, hasStripeConnectAccount] =
    await Promise.all([
      handleStripeCustomerAccount(isRetailer, sessionId),
      userHasStripeConnectAccount(sessionId),
    ]);

  const stripePublishableKey = getStripePublishableKey();
  return json({
    clientSecret,
    appBaseUrl,
    stripePublishableKey,
    hasStripeConnectAccount,
    hasPaymentMethod,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  let sessionId: string | undefined;
  try {
    let formData = await request.formData();
    const intent = formData.get('intent');
    const { session } = await authenticate.admin(request);
    sessionId = session.id;
    const formDataObject = convertFormDataToObject(formData);
    switch (intent) {
      case INTENTS.CREATE_STRIPE_CUSTOMER_ACCOUNT:
        const stripeCustomerData =
          formDataObject as BeginStripeOnboardingFormData;
        return await beginStripeConnectOnboarding(
          stripeCustomerData.appBaseUrl,
        );
      case INTENTS.FINISH_STRIPE_CONNECT_ONBOARDING:
        const stripeConnectData =
          formDataObject as FinishStripeAccountOnboardingFormData;
        return await finishStripeConnectOnboarding(
          stripeConnectData.accountId,
          sessionId,
        );
      case INTENTS.FINISH_STRIPE_CUSTOMER_ONBOARDING:
        return await finishStripeCustomerOnboarding(sessionId);
    }

    return createJSONError(
      `Intent ${intent} is not valid`,
      StatusCodes.NOT_IMPLEMENTED,
    );
  } catch (error) {
    logError(error, { sessionId });
    return getRouteError(
      error,
      'Failed to process request. Please try again later.',
    );
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
    hasPaymentMethod,
  } = useLoaderData<typeof loader>() as LoaderData;

  const [retailerPaymentBanner, setRetailerPaymentBanner] =
    useState<BannerState>({ text: '', tone: 'undefined' });
  const [supplierPaymentBanner, setSupplierPaymentBanner] =
    useState<BannerState>({ text: '', tone: 'undefined' });

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
  const stripePromise = useMemo(
    () => loadStripe(stripePublishableKey),
    [stripePublishableKey],
  );

  // form fetcher for handling stripe connect onboarding
  return (
    <Page
      title={'Payment Integrations'}
      subtitle="Add Stripe Payments integration to reliably disburse funds to suppliers as a retailer, and Stripe Connect integration to reliably get paid as a supplier."
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
                title="Supplier Stripe Connect"
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
                  hasCustomerPaymentMethod={hasPaymentMethod}
                />
              </Elements>
            </Card>
          </Layout.AnnotatedSection>
        )}
        {isSupplier && (
          <StripeConnectOnboarding
            hasStripeConnectAccount={hasStripeConnectAccount}
            appBaseUrl={appBaseUrl}
            setSupplierPaymentBanner={setSupplierPaymentBanner}
          />
        )}
        <TermsOfService />
      </Layout>
      <PaddedBox />
      <PaddedBox />
    </Page>
  );
};

export default PaymentSettings;
