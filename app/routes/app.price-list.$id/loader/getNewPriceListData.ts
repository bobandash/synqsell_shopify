import { PRICE_LIST_PRICING_STRATEGY } from '~/constants';
import type { ProductPropsWithPositions } from '../types';

export function getNewPriceListData() {
  const productsData: ProductPropsWithPositions[] = [];
  const settingsData = {
    isGeneral: true,
    requiresApprovalToImport: false,
    pricingStrategy: PRICE_LIST_PRICING_STRATEGY.MARGIN,
    margin: 10,
  };

  return { productsData, settingsData };
}
