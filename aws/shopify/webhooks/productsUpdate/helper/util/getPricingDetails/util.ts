import { PoolClient } from 'pg';
import { createMapIdToRestObj } from '/opt/nodejs/utils';
import { VariantDetail } from '../../../types';

type ShopifyVariantIdAndSupplierProfit = {
    shopifyVariantId: string;
    supplierProfit: string;
};

function round(value: number, decimals: number): number {
    if (decimals < 0) {
        throw new Error('Decimal must be at least 0 to round properly.');
    }
    const factor = Math.pow(10, decimals);
    const roundedValue = Math.round(value * factor) / factor;
    return roundedValue;
}

function getMarginPricingDetails(editedVariants: VariantDetail[], margin: number) {
    const marginPercentage = margin / 100;

    const prices = editedVariants.map((variant) => {
        const retailPrice = Number(variant.retailPrice);
        const retailerPayment = round(retailPrice * marginPercentage, 2);
        const supplierProfit = round(retailPrice - retailerPayment, 2);

        // Convert to string w/ two decimals to match database fields
        const retailPriceStr = retailPrice.toFixed(2);
        const retailerPaymentStr = retailerPayment.toFixed(2);
        const supplierProfitStr = supplierProfit.toFixed(2);

        return {
            shopifyVariantId: variant.shopifyVariantId,
            retailPrice: retailPriceStr,
            retailerPayment: retailerPaymentStr,
            supplierProfit: supplierProfitStr,
        };
    });
    return prices;
}

// helper functions for getWholesalePricingDetails
async function getShopifyVariantIdToSupplierProfitMap(
    supplierShopifyProductId: string,
    priceListId: string,
    client: PoolClient,
) {
    const query = `
      SELECT 
          "Variant"."shopifyVariantId" AS "shopifyVariantId", 
          "Variant"."supplierProfit" AS "supplierProfit"
      FROM "Variant"
      INNER JOIN "Product" ON "Product"."id" = "Variant"."productId"
      WHERE 
          "Product"."shopifyProductId" = $1 AND 
          "Product"."priceListId" = $2
  `;
    const res: ShopifyVariantIdAndSupplierProfit[] = (
        await client.query(query, [supplierShopifyProductId, priceListId])
    ).rows;

    const shopifyVariantIdToSupplierProfitMap = createMapIdToRestObj(res, 'shopifyVariantId');
    return shopifyVariantIdToSupplierProfitMap;
}

async function getWholesalePricingDetails(
    editedVariants: VariantDetail[],
    priceListId: string,
    supplierShopifyProductId: string,
    client: PoolClient,
) {
    const shopifyVariantIdToSupplierProfit = await getShopifyVariantIdToSupplierProfitMap(
        supplierShopifyProductId,
        priceListId,
        client,
    );

    const prices = editedVariants.map(({ shopifyVariantId, retailPrice }) => {
        const supplierProfit = shopifyVariantIdToSupplierProfit.get(shopifyVariantId)?.supplierProfit;
        if (supplierProfit === undefined) {
            throw new Error('Variant does not have supplier profit.');
        }
        const retailerPayment = round(Number(retailPrice) - Number(supplierProfit), 2).toFixed(2);
        return {
            shopifyVariantId: shopifyVariantId,
            retailPrice: retailPrice,
            retailerPayment: retailerPayment,
            supplierProfit: supplierProfit,
        };
    });
    return prices;
}

export { getMarginPricingDetails, getWholesalePricingDetails };

export const exportsForTesting =
    process.env.NODE_ENV === 'test'
        ? {
              round,
              getMarginPricingDetails,
              getShopifyVariantIdToSupplierProfitMap,
              getWholesalePricingDetails,
          }
        : undefined;
