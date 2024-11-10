import type { LoaderFunctionArgs } from '@remix-run/node';
import {
  json,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';
import { authenticate, registerWebhooks } from './shopify.server';

// TODO: Figure out why 410 status code is being returned in Shopify; only the health check should be running, but we're getting GET / 410 - - 9.234 ms
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
