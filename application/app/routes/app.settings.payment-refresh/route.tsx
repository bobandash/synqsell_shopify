import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { StatusCodes } from 'http-status-codes';
import { useEffect } from 'react';
import createAccountLink from '~/services/stripe/stripeConnect';
import { authenticate } from '~/shopify.server';
import {
  createJSONError,
  getAppBaseUrl,
  handleRouteError,
} from '~/lib/utils/server';

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
      throw createJSONError(
        'No account id was provided.',
        StatusCodes.BAD_REQUEST,
      );
    }
    const accountLink = await createAccountLink(accountId, appBaseUrl);
    return json({ onboardingUrl: accountLink.url });
  } catch (error) {
    throw handleRouteError(error, '/app/settings/payment-refresh');
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
