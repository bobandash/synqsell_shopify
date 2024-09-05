import { hasSession } from '~/services/models/session';
import { createIdListSchema, createIdSchema } from './schemaUtils';
import { isValidPriceList } from '~/services/models/priceList';
import { isValidPartnershipRequest } from '~/services/models/partnershipRequest';
import { hasPartnership } from '~/services/models/partnership';

// for individual id
export const sessionIdSchema = createIdSchema('session', hasSession);
export const priceListIdSchema = createIdSchema('price-list', isValidPriceList);

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
