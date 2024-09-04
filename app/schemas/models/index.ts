import { hasSession } from '~/services/models/session';
import { createIdSchema } from './schemaUtils';
import { isValidPriceList } from '~/services/models/priceList';

export const sessionIdSchema = createIdSchema('session', hasSession);
export const priceListIdSchema = createIdSchema('price-list', isValidPriceList);
