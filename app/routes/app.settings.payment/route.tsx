import { Button, Page } from '@shopify/polaris';
import { useCallback, useState } from 'react';
import { useStripeConnect } from './hooks/useStripeConnect';
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from '@stripe/react-connect-js';
import { json } from '@remix-run/node';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { getStripePublishableKey } from '~/services/stripe/onboarding';
type LoaderData = {
  stripePublishableKey: string;
};

export const loader = async () => {
  try {
    const stripePublishableKey = getStripePublishableKey();
    return json({
      stripePublishableKey,
    });
  } catch (error) {
    throw json(error);
  }
};

const PaymentSettings = () => {
  const navigate = useNavigate();

  const { stripePublishableKey } = useLoaderData<typeof loader>() as LoaderData;
  const [accountCreatePending, setAccountCreatePending] = useState(false);
  const [onboardingExited, setOnboardingExited] = useState(false);
  const [error, setError] = useState(false);
  const [connectedAccountId, setConnectedAccountId] = useState<string>('');
  const stripeConnectInstance = useStripeConnect(
    connectedAccountId,
    stripePublishableKey,
  );

  const navigateUserSettings = useCallback(() => {
    navigate('/app/settings/user');
  }, [navigate]);

  return (
    <Page
      title={'Payment Integration'}
      subtitle="Add Stripe Integration to reliably disburse funds to suppliers if you're a retailer, or get paid as a retailer."
      primaryAction={{
        content: 'User Settings',
        helpText: 'Navigate to user profile settings.',
        onAction: navigateUserSettings,
      }}
    >
      {!accountCreatePending && !connectedAccountId && (
        <div>
          <Button
            variant={'primary'}
            onClick={async () => {
              setAccountCreatePending(true);
              setError(false);
              fetch('/app/api/stripe-account', {
                method: 'POST',
              })
                .then((response) => response.json())
                .then((json) => {
                  setAccountCreatePending(false);
                  const { account, error } = json;

                  if (account) {
                    setConnectedAccountId(account);
                  }

                  if (error) {
                    setError(true);
                  }
                });
            }}
          >
            Start Onboarding Process
          </Button>
        </div>
      )}
      {stripeConnectInstance && (
        <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
          <ConnectAccountOnboarding onExit={() => setOnboardingExited(true)} />
        </ConnectComponentsProvider>
      )}
      {error && <p className="error">Something went wrong!</p>}
      {(connectedAccountId || accountCreatePending || onboardingExited) && (
        <div className="dev-callout">
          {connectedAccountId && (
            <p>
              Your connected account ID is:{' '}
              <code className="bold">{connectedAccountId}</code>
            </p>
          )}
          {accountCreatePending && <p>Creating a connected account...</p>}
          {onboardingExited && (
            <p>The Account Onboarding component has exited</p>
          )}
        </div>
      )}
    </Page>
  );
};

export default PaymentSettings;
