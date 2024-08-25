import type { ProductProps } from '../types';

// adds the field position to both the product and variants for table UI purposes
function getProductsFormattedWithPositions(products: ProductProps[]) {
  let currPosition = 0;

  const newProductsArrWithPositions = products.map(({ variants, ...rest }) => {
    const addExtraOne = Number(variants.length > 1);
    const updatedProduct = {
      ...rest,
      position: currPosition,
      variants: variants.map((variant, index) => ({
        ...variant,
        position: currPosition + index + addExtraOne,
      })),
    };
    currPosition += variants.length;
    return updatedProduct;
  });
  return [...newProductsArrWithPositions];
}

export default getProductsFormattedWithPositions;
