import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useEffect } from 'react';
import createAccountLink from '~/services/stripe/stripeConnect';
import { authenticate } from '~/shopify.server';
import { getAppBaseUrl, getRouteError, logError } from '~/lib/utils/server';
import createHttpError from 'http-errors';

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
    const appBaseUrl = getAppBaseUrl(shop);
    const accountId = searchParams.get('accountId');
    if (!accountId) {
      throw new createHttpError.BadRequest('No account id was provided.');
    }
    const accountLink = await createAccountLink(accountId, appBaseUrl);
    return json({ onboardingUrl: accountLink.url });
  } catch (error) {
    logError(error, 'Loader: Payment Refresh');
    throw getRouteError('Failed to load payment refresh.', error);
  }
};

const StripePaymentRefresh = () => {
  const { onboardingUrl } = useLoaderData<typeof loader>() as LoaderData;

  useEffect(() => {
    if (onboardingUrl) {
      open(onboardingUrl, '_top');
    }
  }, [onboardingUrl]);

  return null;
};

export default StripePaymentRefresh;
