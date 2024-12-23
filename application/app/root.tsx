import { captureRemixErrorBoundaryError } from '@sentry/remix';
import type { LoaderFunctionArgs } from '@remix-run/node';
import {
  json,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from '@remix-run/react';
import { authenticate, registerWebhooks } from './shopify.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (url.pathname === '/health') {
    return json({ message: 'Health check for ECS was successful' });
  }
  const { session } = await authenticate.admin(request);
  await registerWebhooks({ session });

  return json({
    apiKey: process.env.SHOPIFY_API_KEY,
  });
};

export const ErrorBoundary = () => {
  const error = useRouteError();
  captureRemixErrorBoundaryError(error);
  return <div>Something went wrong</div>;
};

export default function App() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
