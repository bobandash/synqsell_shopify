import { Button, Card, Icon, InlineStack, Page, Text } from '@shopify/polaris';
import { useCallback, useEffect, useState } from 'react';
import { useStripeConnect } from './hooks/useStripeConnect';
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from '@stripe/react-connect-js';
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

type LoaderData = {
  appBaseUrl: string;
  stripePublishableKey: string;
  hasStripeAccountInDb: boolean;
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
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    if (accountId) {
      searchParams.delete('accountId');
    }
    const appBaseUrl = `https://${shop}/admin/apps/synqsell/`;
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
  const {
    stripePublishableKey,
    appBaseUrl,

    hasStripeAccountInDb,
  } = useLoaderData<typeof loader>() as LoaderData;
  const [onboardingExited, setOnboardingExited] = useState(false);
  const [connectedAccountId, setConnectedAccountId] = useState<string>('');
  const [stripeOnboardingUrl, setStripeOnboardingUrl] = useState<string>('');
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
        const { accountId, onboardingUrl } = data as BeginStripeOnboardingData;
        setConnectedAccountId(accountId);
        setStripeOnboardingUrl(onboardingUrl);
      }
    }
    beginStripeOnboardingFetcher.data = undefined;
  }, [beginStripeOnboardingFetcher]);

  useEffect(() => {
    if (stripeOnboardingUrl) {
      window.open(stripeOnboardingUrl);
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
        // TODO: Figure out what to display for this
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
