// merchants redirect to app standalone url on staging / prod and embedded url on dev
import type { DeploymentEnv } from '~/types';

function getAppBaseUrl(shop: string) {
  const environment = process.env.DEPLOYMENT_ENV as DeploymentEnv;
  const shopifyApiKey = process.env.SHOPIFY_API_KEY;
  let appBaseUrl = '';
  if (
    (environment === 'staging' || environment === 'production') &&
    !shopifyApiKey
  ) {
    throw new Error(
      `Shopify API key not provided for environment ${environment}.`,
    );
  }

  switch (environment) {
    case 'development':
      const appName = 'synqsell-dev';
      appBaseUrl = `https://${shop}/admin/apps/${appName}/`;
      break;
    case 'staging':
      appBaseUrl = `https://app.staging.synqsell.com/admin/apps/${process.env.SHOPIFY_API_KEY}`;
      break;
    case 'production':
      appBaseUrl = `https://app.prod.synqsell.com/admin/apps/${process.env.SHOPIFY_API_KEY}`;
      break;
    default:
      throw new Error(`${environment} is not a valid environment.`);
  }

  return appBaseUrl;
}

export default getAppBaseUrl;
