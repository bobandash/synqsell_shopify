import type { GraphQL } from '~/types';
import { createProductMedia } from '../shopify/media';
import {
  createProduct,
  type ProductWithVariantImagePriceList,
} from '../shopify/products';
import { createVariants } from '../shopify/variants';
import { errorHandler } from '../util';

export async function createEntireProductShopify(
  product: ProductWithVariantImagePriceList,
  shopifyLocationId: string,
  graphql: GraphQL,
) {
  // get all data for creating a product
  try {
    const { images, variants } = product;
    const newProductId = await createProduct(product, graphql);
    const newImageIds = await createProductMedia(images, newProductId, graphql);
    const newVariantIds = await createVariants(
      variants,
      newProductId,
      shopifyLocationId,
      graphql,
    );
    return {
      newProductId,
      newImageIds,
      newVariantIds,
    };
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create entire product with variant and images',
      createEntireProductShopify,
      {
        product,
        shopifyLocationId,
      },
    );
  }
}


export async function storeCreatedProductInPrisma(product, newProductId, newImageIds){
  
}
