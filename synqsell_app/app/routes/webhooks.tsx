import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, admin } = await authenticate.webhook(request);

  if (!admin) {
    // The admin context isn't returned if the webhook fired after a shop was uninstalled.
    throw new Response();
  }
  // The topics handled here should be declared in the shopify.app.toml.
  // More info: https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration
  switch (topic) {
    case 'APP_UNINSTALLED':
      break;
    case 'PRODUCTS_UPDATE':
      break;
    case 'PRODUCTS_DELETE':
      break;
    case 'BULK_OPERATIONS_FINISH':
      break;
    case 'CUSTOMERS_DATA_REQUEST':
    case 'CUSTOMERS_REDACT':
    case 'SHOP_REDACT':
    default:
      throw new Response('Unhandled webhook topic', { status: 404 });
  }

  throw new Response();
};
