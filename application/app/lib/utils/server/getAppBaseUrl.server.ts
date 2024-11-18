// merchants redirect to app standalone url on staging / prod and embedded url on dev
function getAppBaseUrl(shop: string) {
  const environment = process.env.NODE_ENV;
  let appBaseUrl = '';
  switch (environment) {
    case 'development':
      const appName = 'synqsell-dev';
      appBaseUrl = `https://${shop}/admin/apps/${appName}/`;
      break;
    case 'production':
      appBaseUrl = `https://app.staging.synqsell.com/admin/apps/${process.env.SHOPIFY_API_KEY}`;
      break;
    case 'test':
      appBaseUrl = `https://app.prod.synqsell.com/admin/apps/${process.env.SHOPIFY_API_KEY}`;
      break;
    default:
      throw new Error(`${environment} is not a valid environment.`);
  }

  return appBaseUrl;
}

export default getAppBaseUrl;
