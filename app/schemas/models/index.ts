import { hasSession } from '~/services/models/session';
import { createIdListSchema, createIdSchema } from './schemaUtils';
import { isValidPriceList } from '~/services/models/priceList';
import { isValidPartnershipRequest } from '~/services/models/partnershipRequest';
import { hasPartnership } from '~/services/models/partnership';
import { hasProduct } from '~/services/models/product';
import { hasShopifyFulfillmentServiceId } from '~/services/models/fulfillmentService';

// for individual id
export const sessionIdSchema = createIdSchema('session', hasSession);
export const priceListIdSchema = createIdSchema('price-list', isValidPriceList);
export const productIdSchema = createIdSchema('product', hasProduct);
export const shopifyFulfillmentServiceIdSchema = createIdSchema(
  'shopify-fulfillment-service',
  hasShopifyFulfillmentServiceId,
);

// for list of ids
export const partnershipRequestIdListSchema = createIdListSchema(
  'partnership-request',
  isValidPartnershipRequest,
);
export const partnershipIdListSchema = createIdListSchema(
  'partnership',
  hasPartnership,
);
export const priceListIdListSchema = createIdListSchema(
  'price-list',
  isValidPriceList,
);
