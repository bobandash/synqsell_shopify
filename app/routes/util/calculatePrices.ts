import { round } from '~/routes/util';

// TODO: Figure out if price really isn't required in shopify graphql
function calculateRetailerPaymentGivenMargin(
  price: string | number | null,
  margin: string | number,
) {
  if (!price) {
    price = 0;
  }

  return round(Number(price) * (Number(margin) / 100), 2).toFixed(2);
}

function calculatePriceDifference(
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

export { calculateRetailerPaymentGivenMargin, calculatePriceDifference };
