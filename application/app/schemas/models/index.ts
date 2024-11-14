import { hasSession } from '~/services/models/session.server';
import { createIdListSchema, createIdSchema } from './schemaUtils';
import { isValidPriceList } from '~/services/models/priceList.server';
import { isValidPartnershipRequest } from '~/services/models/partnershipRequest.server';
import { hasPartnership } from '~/services/models/partnership.server';
import { hasProduct } from '~/services/models/product.server';
import { hasFulfillmentService } from '~/services/models/fulfillmentService.server';
import { isValidChecklistStatusId } from '~/services/models/checklistStatus.server';

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
