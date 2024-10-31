import type { HeadersFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import {
  isRouteErrorResponse,
  Link,
  Outlet,
  useLoaderData,
  useRouteError,
} from '@remix-run/react';
import { boundary } from '@shopify/shopify-app-remix/server';
import { AppProvider } from '@shopify/shopify-app-remix/react';
import { NavMenu } from '@shopify/app-bridge-react';
import polarisStyles from '@shopify/polaris/build/esm/styles.css?url';
import { authenticate } from '../../shopify.server';
import { getRoles } from '~/services/models/roles';
import { ROLES } from '~/constants';
import { useEffect, useState } from 'react';
import { RoleProvider } from '~/context/RoleProvider';
import { getJSONError } from '~/lib/utils/server';
import {
  BlockStack,
  Card,
  InlineStack,
  Page,
  Text,
  Image,
  Link as PolarisLink,
} from '@shopify/polaris';
import { PaddedBox } from '~/components';
import { getReasonPhrase } from 'http-status-codes';
import { WarningIcon } from '~/assets';
import { userHasStripeConnectAccount } from '~/services/models/stripeConnectAccount';
import { userHasStripePaymentMethod } from '~/services/models/stripeCustomerAccount';
import sharedStyles from '~/shared.module.css';
import { handleBilling } from './loader';

export const links = () => [{ rel: 'stylesheet', href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const {
      session: { id: sessionId, shop },
      billing,
    } = await authenticate.admin(request);

    await handleBilling(shop, sessionId, billing);

    const [roles, hasStripeConnectAccount, hasStripePaymentMethod] =
      await Promise.all([
        getRoles(sessionId),
        userHasStripeConnectAccount(sessionId),
        userHasStripePaymentMethod(sessionId),
      ]);

    const roleNames = roles.map((role) => role.name);

    return json({
      apiKey: process.env.SHOPIFY_API_KEY || '',
      roleNames,
      hasStripeConnectAccount,
      hasStripePaymentMethod,
    });
  } catch (error) {
    throw getJSONError(error, '/app');
  }
};

export default function App() {
  const {
    apiKey,
    roleNames: dbRoles,
    hasStripeConnectAccount,
    hasStripePaymentMethod,
  } = useLoaderData<typeof loader>();
  const [roles, setRoles] = useState(new Set(dbRoles));
  useEffect(() => {
    setRoles(new Set(dbRoles));
  }, [dbRoles]);

  const isSupplier = roles.has(ROLES.SUPPLIER);
  const isRetailer = roles.has(ROLES.RETAILER);
  const isAdmin = roles.has(ROLES.ADMIN);

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <RoleProvider roles={roles} setRoles={setRoles}>
        <NavMenu>
          <Link to="/app" rel="home">
            Home
          </Link>
          {isAdmin && <Link to="/app/admin">Admin</Link>}
          {isRetailer && hasStripePaymentMethod && (
            <Link to="/app/supplier-network">Supplier Network</Link>
          )}
          {isSupplier && hasStripeConnectAccount && (
            <Link to="/app/retailer-network">Retailer Network</Link>
          )}
          {isSupplier && <Link to="/app/price-list">Price Lists</Link>}
          {(isSupplier || isRetailer) && (
            <>
              <Link to="/app/partnerships">Partnerships</Link>
              <Link to="/app/settings">Settings</Link>
            </>
          )}
        </NavMenu>
        <Outlet />
      </RoleProvider>
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  const error = useRouteError();
  console.log(error);

  let reason = 'Unhandled error. Please contact support.';
  let status = 500;
  if (isRouteErrorResponse(error)) {
    if (error && 'data' in error && 'message' in error.data) {
      reason = error.data.message;
    }
    status = error.status;
  }

  return (
    <Page>
      <Card>
        <PaddedBox />
        <BlockStack gap="200">
          <InlineStack align="center">
            <div className={`${sharedStyles['error-image-container']}`}>
              <Image source={WarningIcon} alt={'Warning Icon'} />
            </div>
          </InlineStack>
          <Text
            variant="heading2xl"
            as="h1"
            fontWeight="bold"
            alignment="center"
          >
            {status} {getReasonPhrase(status)}
          </Text>
          <Text
            variant="headingXl"
            as="h2"
            fontWeight="bold"
            alignment="center"
          >
            {reason}
          </Text>
          <Text variant="bodyLg" as="p" fontWeight="bold" alignment="center">
            Navigate back to <PolarisLink url="/app">main screen</PolarisLink>{' '}
            or{' '}
            <PolarisLink url="mailto:synqsell@gmail.com">
              contact support
            </PolarisLink>
            .
          </Text>
        </BlockStack>
        <PaddedBox />
      </Card>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
