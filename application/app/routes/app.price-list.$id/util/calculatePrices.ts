import { round } from '~/routes/util';
type CalculateRetailerPaymentProps = {
  isWholesalePriceList: boolean;
  price: string | null;
  margin: string;
  wholesalePrice: string | number | null;
  hasError: boolean;
};

type ProfitCalculationForMarginPricing = {
  isWholesalePriceList: boolean;
  price: string | null;
  retailerPayment: string;
};

function calculateRetailerPaymentGivenMargin(
  price: string | number | null,
  margin: string | number,
) {
  if (!price) {
    price = 0;
  }

  return round(Number(price) * (Number(margin) / 100), 2).toFixed(2);
}

export function calculatePriceDifference(
  priceOne: string | number | null,
  priceTwo: string | number | null,
) {
  if (!priceOne) {
    priceOne = 0;
  }
  if (!priceTwo) {
    priceTwo = 0;
  }
  return round(Number(priceOne) - Number(priceTwo), 2).toFixed(2);
}

export function calculateRetailerPayment({
  isWholesalePriceList,
  price,
  margin,
  wholesalePrice,
  hasError,
}: CalculateRetailerPaymentProps) {
  if (hasError) {
    return 'N/A';
  }

  if (!isWholesalePriceList) {
    return calculateRetailerPaymentGivenMargin(price, margin);
  }
  return calculatePriceDifference(price, wholesalePrice);
}

export function calculateSupplierProfitForMarginPricing({
  isWholesalePriceList,
  price,
  retailerPayment,
}: ProfitCalculationForMarginPricing) {
  if (isWholesalePriceList || price === null) {
    return 'N/A';
  }
  return calculatePriceDifference(price, retailerPayment);
}
