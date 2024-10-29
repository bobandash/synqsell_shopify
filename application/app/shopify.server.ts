import '@shopify/shopify-app-remix/adapters/node';
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from '@shopify/shopify-app-remix/server';
import { PrismaSessionStorage } from '@shopify/shopify-app-session-storage-prisma';
import { BillingInterval } from '@shopify/shopify-api';
import { restResources } from '@shopify/shopify-api/rest/admin/2024-07';
import prisma from './db.server';
import { PLANS } from './constants';

// https://shopify.dev/docs/api/shopify-app-remix/v2/apis/billing
// https://github.com/Shopify/shopify-api-js/blob/main/packages/shopify-api/docs/guides/billing.md#configuring-billing
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || '',
  apiVersion: ApiVersion.July24,
  scopes: process.env.SCOPES?.split(','),
  appUrl: process.env.SHOPIFY_APP_URL || '',
  authPathPrefix: '/auth',
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  restResources,
  billing: {
    [PLANS.BASIC_PLAN]: {
      lineItems: [
        {
          amount: 100, // Pay up to $100 per 30 days w/ 5% commission
          currencyCode: 'USD',
          interval: BillingInterval.Usage,
          terms: '5% commission on all retailer and supplier proceeds.',
        },
      ],
    },
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
  hooks: {
    afterAuth: async ({ session }) => {
      const register_result = await shopify.registerWebhooks({ session });
      console.log('AFTER REGISTER WEBHOOKS', register_result);
    },
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.July24;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
