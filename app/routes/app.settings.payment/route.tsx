import { Button, Page } from '@shopify/polaris';
import { useCallback, useEffect, useState } from 'react';
import { useStripeConnect } from './hooks/useStripeConnect';
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from '@stripe/react-connect-js';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useFetcher, useLoaderData, useNavigate } from '@remix-run/react';
import { getStripePublishableKey } from '~/services/stripe/onboarding';
import { convertFormDataToObject } from '~/util';
import { INTENTS } from './constants';
import {
  beginStripeOnboarding,
  type BeginStripeOnboardingData,
} from './server/actions';
import { StatusCodes } from 'http-status-codes';
import { createAccountLink } from './server/util';

type LoaderData = {
  appPaymentUrl: string;
  stripePublishableKey: string;
  onboardingUrl?: string;
};

type BeginStripeOnboardingFormData = {
  intent: string;
  appPaymentUrl: string;
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    const url = new URL(request.url);
    const appPaymentUrl = `${url.origin}${url.pathname}`;
    const queryParams = url.searchParams;
    const accountId = queryParams.get('accountId');
    let onboardingUrl = '';
    if (accountId) {
      onboardingUrl = (await createAccountLink(accountId, appPaymentUrl)).url;
    }
    const stripePublishableKey = getStripePublishableKey();
    return json({
      ...(onboardingUrl ? { onboardingUrl } : {}),
      appPaymentUrl,
      stripePublishableKey,
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
      return beginStripeOnboarding(data.appPaymentUrl);
  }
  return json({ data: 'Not Implemented' }, StatusCodes.NOT_IMPLEMENTED);
};

const PaymentSettings = () => {
  const navigate = useNavigate();
  const { stripePublishableKey, appPaymentUrl, onboardingUrl } = useLoaderData<
    typeof loader
  >() as LoaderData;
  const [onboardingExited, setOnboardingExited] = useState(false);
  const [connectedAccountId, setConnectedAccountId] = useState<string>('');
  const [stripeOnboardingUrl, setStripeOnboardingUrl] = useState<string>(
    onboardingUrl ?? '',
  );
  const stripeConnectInstance = useStripeConnect(
    connectedAccountId,
    stripePublishableKey,
  );

  const navigateUserSettings = useCallback(() => {
    navigate('/app/settings/user');
  }, [navigate]);

  // form fetcher for handling stripe connect onboarding
  const beginStripeOnboardingFetcher = useFetcher({
    key: INTENTS.CREATE_ACCOUNT,
  });

  const handleBeginOnboarding = useCallback(() => {
    beginStripeOnboardingFetcher.submit(
      { intent: INTENTS.CREATE_ACCOUNT, appPaymentUrl: appPaymentUrl },
      { method: 'POST' },
    );
  }, [beginStripeOnboardingFetcher, appPaymentUrl]);

  useEffect(() => {
    if (
      beginStripeOnboardingFetcher.state == 'idle' &&
      beginStripeOnboardingFetcher.data
    ) {
      const data = beginStripeOnboardingFetcher.data;
      if (data) {
        const { accountId, onboardingUrl } = data as BeginStripeOnboardingData;
        setConnectedAccountId(accountId);
        setStripeOnboardingUrl(onboardingUrl);
      }
    }
    beginStripeOnboardingFetcher.data = undefined;
  }, [beginStripeOnboardingFetcher]);

  useEffect(() => {
    if (stripeOnboardingUrl) {
      window.open(stripeOnboardingUrl, '_blank');
    }
  }, [stripeOnboardingUrl]); // handle refresh url logic https://docs.stripe.com/api/account_links/create#create_account_link-refresh_url

  return (
    <Page
      title={'Payment Integration'}
      subtitle="Add stripe Integration to reliably disburse funds to suppliers if you're a retailer, or get paid as a retailer."
      primaryAction={{
        content: 'User Settings',
        helpText: 'Navigate to user profile settings.',
        onAction: navigateUserSettings,
      }}
    >
      {!connectedAccountId && (
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
      )}
      {/* I don't really know what the below code is for yet */}
      {stripeConnectInstance && (
        <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
          <ConnectAccountOnboarding onExit={() => setOnboardingExited(true)} />
        </ConnectComponentsProvider>
      )}
      {onboardingExited && <div>You have left the onboarding process.</div>}
    </Page>
  );
};

export default PaymentSettings;
