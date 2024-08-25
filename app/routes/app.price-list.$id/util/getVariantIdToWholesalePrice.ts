import type { ProductPropsWithPositions } from '../types';

function getVariantIdToWholesalePrice(
  products: ProductPropsWithPositions[],
): Map<string, number> {
  const variantIdToWholesalePrice = new Map();
  products.forEach(({ variants }) => {
    variants.forEach(({ id, wholesalePrice }) => {
      if (wholesalePrice) {
        variantIdToWholesalePrice.set(id, wholesalePrice);
      }
    });
  });
  return variantIdToWholesalePrice;
}

export default getVariantIdToWholesalePrice;
