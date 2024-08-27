import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import db from '../db.server';

// TODO: switch to cloud to save costs
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, admin, payload } =
    await authenticate.webhook(request);

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
      console.log('product was updated!');
      break;
    case 'BULK_OPERATIONS_FINISH':
      console.log(payload);
      break;
    case 'CUSTOMERS_DATA_REQUEST':
    case 'CUSTOMERS_REDACT':
    case 'SHOP_REDACT':
    default:
      throw new Response('Unhandled webhook topic', { status: 404 });
  }

  throw new Response();
};
