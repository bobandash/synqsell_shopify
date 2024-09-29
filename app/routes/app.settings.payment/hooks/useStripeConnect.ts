import { useState, useEffect } from 'react';
import {
  loadConnectAndInitialize,
  type StripeConnectInstance,
} from '@stripe/connect-js';

export const useStripeConnect = (
  connectedAccountId: string,
  stripePublishableKey: string,
) => {
  const [stripeConnectInstance, setStripeConnectInstance] =
    useState<StripeConnectInstance>();

  useEffect(() => {
    if (connectedAccountId) {
      const fetchClientSecret = async () => {
        const response = await fetch('/app/api/stripe-account-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            account: connectedAccountId,
          }),
        });

        if (!response.ok) {
          // Handle errors on the client side here
          const { error } = await response.json();
          console.error(error);
          throw new Error('An error occurred: ', error);
        } else {
          const { client_secret: clientSecret } = await response.json();
          return clientSecret;
        }
      };

      setStripeConnectInstance(
        loadConnectAndInitialize({
          publishableKey: stripePublishableKey,
          fetchClientSecret,
          appearance: {
            overlays: 'dialog',
            variables: {
              colorPrimary: '#635BFF',
            },
          },
        }),
      );
    }
  }, [connectedAccountId, stripePublishableKey]);

  return stripeConnectInstance;
};

export default useStripeConnect;
