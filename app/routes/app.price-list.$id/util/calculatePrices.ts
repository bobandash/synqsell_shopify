import { round } from "~/routes/util";

function calculateRetailerPaymentGivenMargin(
  price: string | number,
  margin: string | number,
) {
  return round(Number(price) * (Number(margin) / 100), 2).toFixed(2);
}

function calculatePriceDifference(
  priceOne: string | number,
  priceTwo: string | number,
) {
  return round(Number(priceOne) - Number(priceTwo), 2).toFixed(2);
}

export { calculateRetailerPaymentGivenMargin, calculatePriceDifference };
