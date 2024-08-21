import type { ProductPropsWithPositions } from "../types";

function getVariantIdToWholesalePrice(products: ProductPropsWithPositions[]) {
  const variantIdToWholesalePrice = new Map();
  products.forEach(({ variants }) => {
    variants.forEach(({ id, wholesalePrice }) => {
      variantIdToWholesalePrice.set(id, wholesalePrice);
    });
  });
  return variantIdToWholesalePrice;
}

export default getVariantIdToWholesalePrice;
