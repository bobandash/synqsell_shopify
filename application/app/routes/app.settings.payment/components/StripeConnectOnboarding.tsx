import { Button, Card, Layout, Text } from '@shopify/polaris';
import { useCallback, useEffect, useState } from 'react';
import SuccessfulIntegration from './SuccessfulIntegration';
import { FETCHER_KEYS, INTENTS } from '../constants';
import { useFetcher, useSearchParams } from '@remix-run/react';
import type {
  BeginStripeOnboardingData,
  FinishStripeConnectOnboardingData,
} from '../actions';
import type { BannerState } from '../types';

type Props = {
  hasStripeConnectAccount: boolean;
  appBaseUrl: string;
  setSupplierPaymentBanner: React.Dispatch<React.SetStateAction<BannerState>>;
};

const StripeConnectOnboarding = ({
  hasStripeConnectAccount,
  appBaseUrl,
  setSupplierPaymentBanner,
}: Props) => {
  const [stripeOnboardingUrl, setStripeOnboardingUrl] = useState<string>('');
  const beginStripeConnectOnboardingFetcher = useFetcher({
    key: FETCHER_KEYS.CREATE_STRIPE_CONNECT_ACCOUNT,
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const finishStripeConnectOnboardingFetcher = useFetcher({
    key: FETCHER_KEYS.FINISH_STRIPE_CONNECT_ACCOUNT,
  });
  const [hasSubmittedConnect, setHasSubmittedConnect] =
    useState<boolean>(false);

  useEffect(() => {
    const accountId = searchParams.get('accountId');
    if (!accountId) {
      return;
    }
    const data =
      finishStripeConnectOnboardingFetcher.data as FinishStripeConnectOnboardingData;
    if (data) {
      const isSuccess = data && 'message' in data;
      const isFailure = data && 'error' in data && 'message' in data.error;
      if (isSuccess && finishStripeConnectOnboardingFetcher.state === 'idle') {
        setSearchParams(new URLSearchParams());
        setSupplierPaymentBanner({
          text: data.message,
          tone: 'warning',
        });
      } else if (isFailure) {
        setSupplierPaymentBanner({
          text: data.error.message,
          tone: 'warning',
        });
      }
    } else if (!hasSubmittedConnect) {
      setHasSubmittedConnect(true);
      finishStripeConnectOnboardingFetcher.submit(
        {
          intent: INTENTS.FINISH_STRIPE_CONNECT_ONBOARDING,
          accountId: accountId,
        },
        {
          method: 'POST',
        },
      );
    }
  }, [
    searchParams,
    setSearchParams,
    finishStripeConnectOnboardingFetcher,
    hasStripeConnectAccount,
    hasSubmittedConnect,
    setHasSubmittedConnect,
    setSupplierPaymentBanner,
  ]);

  useEffect(() => {
    if (
      beginStripeConnectOnboardingFetcher.state == 'idle' &&
      beginStripeConnectOnboardingFetcher.data
    ) {
      const data = beginStripeConnectOnboardingFetcher.data;
      if (data) {
        const { onboardingUrl } = data as BeginStripeOnboardingData;
        setStripeOnboardingUrl(onboardingUrl);
      }
    }
    beginStripeConnectOnboardingFetcher.data = undefined;
  }, [beginStripeConnectOnboardingFetcher]);

  useEffect(() => {
    if (stripeOnboardingUrl) {
      open(stripeOnboardingUrl, '_top');
    }
  }, [stripeOnboardingUrl]);

  const handleBeginStripeConnectOnboarding = useCallback(() => {
    beginStripeConnectOnboardingFetcher.submit(
      {
        intent: INTENTS.CREATE_STRIPE_CUSTOMER_ACCOUNT,
        appBaseUrl: appBaseUrl,
      },
      { method: 'POST' },
    );
  }, [beginStripeConnectOnboardingFetcher, appBaseUrl]);

  return (
    <Layout.AnnotatedSection
      id="supplierPaymentMethod"
      title="Receive Payments (Supplier)"
      description="Onboard with Stripe Connect to receive payments from retailers."
    >
      {finishStripeConnectOnboardingFetcher.state === 'submitting' ||
      finishStripeConnectOnboardingFetcher.state === 'loading' ? (
        <Card>
          <Text as="p">Processing stripe connect account status...</Text>
        </Card>
      ) : !hasStripeConnectAccount ? (
        <Card>
          <Button
            variant={'primary'}
            onClick={handleBeginStripeConnectOnboarding}
            disabled={
              beginStripeConnectOnboardingFetcher.state === 'submitting'
            }
          >
            {beginStripeConnectOnboardingFetcher.state === 'submitting'
              ? 'Starting onboarding process...'
              : 'Start Onboarding Process'}
          </Button>
        </Card>
      ) : (
        <Card>
          <SuccessfulIntegration text="Stripe Connect has been successfully integrated." />
        </Card>
      )}
    </Layout.AnnotatedSection>
  );
};

export default StripeConnectOnboarding;
