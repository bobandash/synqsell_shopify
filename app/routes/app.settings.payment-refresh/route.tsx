import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useEffect } from 'react';
import createAccountLink from '~/services/stripe/onboarding';

type LoaderData = {
  onboardingUrl: string;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { origin: appBaseUrl, searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    if (!accountId) {
      throw json({ error: 'No account id was provided' });
    }
    const accountLink = await createAccountLink(accountId, appBaseUrl);
    return json({ onboardingUrl: accountLink.url });
  } catch (error) {
    throw json(error);
  }
};

const StripePaymentRefresh = () => {
  const { onboardingUrl } = useLoaderData<typeof loader>() as LoaderData;

  useEffect(() => {
    if (onboardingUrl) {
      window.open(onboardingUrl);
    }
  }, [onboardingUrl]);

  return <div></div>;
};

export default StripePaymentRefresh;
