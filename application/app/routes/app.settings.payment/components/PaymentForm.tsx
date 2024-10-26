import {
  BlockStack,
  Button,
  Card,
  Form,
  Icon,
  InlineStack,
  Text,
} from '@shopify/polaris';
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
import { CheckCircleIcon } from '@shopify/polaris-icons';

type Props = {
  appBaseUrl: string;
  setRetailerPaymentBanner: React.Dispatch<React.SetStateAction<BannerState>>;
  hasCustomerPaymentMethod: boolean;
};

// TODO: allow suppliers and retailers to change their integration
// https://docs.stripe.com/payments/save-and-reuse?platform=web&ui=elements#:~:text=A%20SetupIntent%20is%20an%20object%20that%20represents%20your,Dashboard%20settings%20or%20you%20can%20list%20them%20manually.
const PaymentForm: FC<Props> = ({
  appBaseUrl,
  setRetailerPaymentBanner,
  hasCustomerPaymentMethod,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const shopify = useAppBridge();
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [addedPaymentMethod, setAddedPaymentMethod] = useState<boolean>(false);

  const finishOnboardingFetcher = useFetcher({
    key: FETCHER_KEYS.FINISH_STRIPE_ONBOARDING,
  });

  const handleFinishPaymentsOnboarding = useCallback(() => {
    finishOnboardingFetcher.submit(
      {
        intent: INTENTS.FINISH_STRIPE_CUSTOMER_ONBOARDING,
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
              text: 'Success! Your retailer payment method has been saved. Please refresh the page.',
              tone: 'success',
            });
            setIsProcessing(false);
            setAddedPaymentMethod(true);
            handleFinishPaymentsOnboarding();
            break;
          case 'processing':
            setIsProcessing(true);
            setRetailerPaymentBanner({
              text: "Processing payment details. We'll update you when processing is complete.",
              tone: 'info',
            });
            break;
          case 'requires_payment_method':
            setIsProcessing(false);
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
      retrievePaymentMethodId(setupIntentClientSecret);
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('setup_intent_client_secret');
        newParams.delete('setup_intent');
        newParams.delete('redirect_status');
        return newParams;
      });
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

  if (isProcessing) {
    return (
      <Card>
        <Text as="p">Loading..</Text>
      </Card>
    );
  }

  if (addedPaymentMethod || hasCustomerPaymentMethod) {
    return (
      <BlockStack gap="200">
        <InlineStack gap="100">
          <div>
            <Icon source={CheckCircleIcon} tone="base" />
          </div>
          <Text variant="headingMd" as="h2" fontWeight="bold">
            Payment method was successfully added.
          </Text>
        </InlineStack>
      </BlockStack>
    );
  }

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
