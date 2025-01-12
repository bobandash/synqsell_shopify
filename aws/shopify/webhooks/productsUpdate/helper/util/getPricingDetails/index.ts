import { PoolClient } from 'pg';
import { PriceListDetails, VariantDetail } from '../../../types';
import { getMarginPricingDetails, getWholesalePricingDetails } from './util';

const PRICE_LIST_PRICING_STRATEGY = {
    WHOLESALE: 'WHOLESALE',
    MARGIN: 'MARGIN',
} as const;

// Price Lists can have two strategies: a pricing strategy based on margin and pricing strategy based on fixed wholesale rate
// If it's based on margin, we have to recalculate the supplier profit
// If it's based on fixed wholesale rate, we don't have to calculate supplier profit
async function getVariantPricingDetails(
    editedVariants: VariantDetail[],
    priceList: PriceListDetails,
    supplierShopifyProductId: string,
    client: PoolClient,
) {
    if (priceList.pricingStrategy === PRICE_LIST_PRICING_STRATEGY.MARGIN && priceList.margin) {
        return getMarginPricingDetails(editedVariants, priceList.margin);
    } else if (priceList.pricingStrategy === PRICE_LIST_PRICING_STRATEGY.WHOLESALE) {
        return await getWholesalePricingDetails(editedVariants, priceList.id, supplierShopifyProductId, client);
    } else {
        throw new Error('Price list Pricing Strategy is invalid.');
    }
}

export default getVariantPricingDetails;
