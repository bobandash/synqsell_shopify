import { BlockStack, Button, Form, InlineStack } from '@shopify/polaris';
import {
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { useCallback, useEffect, useState, type FC } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { useFetcher, useSearchParams } from '@remix-run/react';
import type { BannerState } from '../types';
import { FETCHER_KEYS, INTENTS } from '../constants';

type Props = {
  appBaseUrl: string;
  setRetailerPaymentBanner: React.Dispatch<React.SetStateAction<BannerState>>;
};

// https://docs.stripe.com/payments/save-and-reuse?platform=web&ui=elements#:~:text=A%20SetupIntent%20is%20an%20object%20that%20represents%20your,Dashboard%20settings%20or%20you%20can%20list%20them%20manually.
const PaymentForm: FC<Props> = ({ appBaseUrl, setRetailerPaymentBanner }) => {
  const stripe = useStripe();
  const elements = useElements();
  const shopify = useAppBridge();
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  const finishOnboardingFetcher = useFetcher({
    key: FETCHER_KEYS.FINISH_STRIPE_ONBOARDING,
  });

  const handleFinishPaymentsOnboarding = useCallback(() => {
    finishOnboardingFetcher.submit(
      {
        intent: INTENTS.FINISH_STRIPE_PAYMENTS_ONBOARDING,
      },
      { method: 'POST' },
    );
  }, [finishOnboardingFetcher]);

  const retrievePaymentMethodId = useCallback(
    async (setupIntentClientSecret: string) => {
      if (!stripe) {
        return;
      }
      const processingInterval = setInterval(async () => {
        const result = await stripe.retrieveSetupIntent(
          setupIntentClientSecret,
        );
        const setupIntent = result.setupIntent;
        if (setupIntent?.status !== 'processing') {
          clearInterval(processingInterval);
        }
        switch (setupIntent?.status) {
          case 'succeeded':
            setRetailerPaymentBanner({
              text: 'Success! Your retailer payment method has been saved.',
              tone: 'success',
            });
            handleFinishPaymentsOnboarding();
            break;
          case 'processing':
            setRetailerPaymentBanner({
              text: "Processing payment details. We'll update you when processing is complete.",
              tone: 'info',
            });
            break;
          case 'requires_payment_method':
            setRetailerPaymentBanner({
              text: 'Failed to process payment details. Please try another payment method.',
              tone: 'warning',
            });
            break;
        }
      }, 5000);
    },
    [stripe, setRetailerPaymentBanner, handleFinishPaymentsOnboarding],
  );

  useEffect(() => {
    if (!stripe) {
      return;
    }
    const setupIntentClientSecret = searchParams.get(
      'setup_intent_client_secret',
    );
    if (setupIntentClientSecret) {
      setSearchParams({}, { preventScrollReset: true });
      retrievePaymentMethodId(setupIntentClientSecret);
    }
  }, [searchParams, stripe, setSearchParams, retrievePaymentMethodId]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!stripe || !elements) {
        return;
      }
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${appBaseUrl}/app/settings/payment`,
        },
      });
      if (error && error.message) {
        setError(error.message);
      }
    },
    [elements, stripe, appBaseUrl],
  );

  useEffect(() => {
    if (error) {
      shopify.toast.show(error, {
        isError: true,
      });
    }
  }, [error, shopify]);

  return (
    <Form onSubmit={handleSubmit}>
      <BlockStack gap="200">
        <PaymentElement />
        <InlineStack align="end">
          <Button variant="primary" submit>
            Add Payment Method
          </Button>
        </InlineStack>
      </BlockStack>
    </Form>
  );
};

export default PaymentForm;
