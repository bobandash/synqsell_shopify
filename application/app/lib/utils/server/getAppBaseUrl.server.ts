function getAppBaseUrl(shop: string) {
  let appName = '';
  const environment = process.env.NODE_ENV;
  switch (environment) {
    case 'development':
      appName = 'synqsell-dev';
      break;
    case 'production':
      appName = 'synqsell';
      break;
    case 'test':
      appName = 'synqsell-staging';
      break;
    default:
      throw new Error('Not a valid environment.');
  }

  const appBaseUrl = `https://${shop}/admin/apps/${appName}/`;
  return appBaseUrl;
}

export default getAppBaseUrl;
