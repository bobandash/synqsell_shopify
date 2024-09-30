import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useEffect } from 'react';
import createAccountLink from '~/services/stripe/stripeConnect';
import { authenticate } from '~/shopify.server';

type LoaderData = {
  onboardingUrl: string;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const {
      session: { shop },
    } = await authenticate.admin(request);
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const appBaseUrl = `https://${shop}/admin/apps/synqsell/`;
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
      open(onboardingUrl, '_top');
    }
  }, [onboardingUrl]);

  return <div></div>;
};

export default StripePaymentRefresh;
