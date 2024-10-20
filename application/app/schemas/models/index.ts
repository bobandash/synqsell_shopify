import { hasSession } from '~/services/models/session';
import { createIdListSchema, createIdSchema } from './schemaUtils';
import { isValidPriceList } from '~/services/models/priceList';
import { isValidPartnershipRequest } from '~/services/models/partnershipRequest';
import { hasPartnership } from '~/services/models/partnership';
import { hasProduct } from '~/services/models/product';
import { hasFulfillmentService } from '~/services/models/fulfillmentService';
import { isValidChecklistStatusId } from '~/services/models/checklistStatus';

// for individual id
export const sessionIdSchema = createIdSchema('session', hasSession);
export const priceListIdSchema = createIdSchema('price-list', isValidPriceList);
export const productIdSchema = createIdSchema('product', hasProduct);
export const fulfillmentServiceIdSchema = createIdSchema(
  'fulfillment-service',
  hasFulfillmentService,
);

export const checklistStatusIdSchema = createIdSchema(
  'checkliist-status-id',
  isValidChecklistStatusId,
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
