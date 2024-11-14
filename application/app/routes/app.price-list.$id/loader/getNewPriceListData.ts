import { PRICE_LIST_PRICING_STRATEGY } from '~/constants';
import { getPartnershipData } from './getPartnershipData';
import type { ProductPropsWithPositions } from '../types';

export async function getNewPriceListData(sessionId: string) {
  const productsData: ProductPropsWithPositions[] = [];
  const settingsData = {
    isGeneral: true,
    requiresApprovalToImport: false,
    pricingStrategy: PRICE_LIST_PRICING_STRATEGY.MARGIN,
    margin: 10,
  };
  const partnershipsData = await getPartnershipData(sessionId);
  return { productsData, settingsData, partnershipsData };
}
