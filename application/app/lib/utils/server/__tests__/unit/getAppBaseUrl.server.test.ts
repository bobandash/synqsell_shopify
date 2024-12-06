import getAppBaseUrl from '../../getAppBaseUrl.server';

describe('getAppBaseUrl', () => {
  const originalEnv = process.env;
  const testShop = 'test-shop.myshopify.com';

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('should return embedded URL for development environment', () => {
    process.env.DEPLOYMENT_ENV = 'development';
    const result = getAppBaseUrl(testShop);
    expect(result).toBe(
      'https://test-shop.myshopify.com/admin/apps/synqsell-dev/',
    );
  });

  test('should return standalone URL for staging environment', () => {
    process.env.DEPLOYMENT_ENV = 'staging';
    process.env.SHOPIFY_API_KEY = 'test-api-key';
    const result = getAppBaseUrl(testShop);
    expect(result).toBe(
      'https://app.staging.synqsell.com/admin/apps/test-api-key',
    );
  });

  test('should return standalone URL for production environment', () => {
    process.env.DEPLOYMENT_ENV = 'production';
    process.env.SHOPIFY_API_KEY = 'prod-api-key';

    const result = getAppBaseUrl(testShop);
    expect(result).toBe(
      'https://app.prod.synqsell.com/admin/apps/prod-api-key',
    );
  });

  test('should throw error for invalid environment', () => {
    process.env.DEPLOYMENT_ENV = 'Invalid';
    expect(() => getAppBaseUrl(testShop)).toThrow(
      'Invalid is not a valid environment.',
    );
  });

  test('should throw error for missing SHOPIFY_API_KEY in staging', () => {
    process.env.DEPLOYMENT_ENV = 'staging';
    delete process.env.SHOPIFY_API_KEY;
    expect(() => getAppBaseUrl(testShop)).toThrow(
      `Shopify API key not provided for environment staging.`,
    );
  });

  test('should throw error for missing SHOPIFY_API_KEY in production', () => {
    process.env.DEPLOYMENT_ENV = 'production';
    delete process.env.SHOPIFY_API_KEY;
    expect(() => getAppBaseUrl(testShop)).toThrow(
      `Shopify API key not provided for environment production.`,
    );
  });
});
