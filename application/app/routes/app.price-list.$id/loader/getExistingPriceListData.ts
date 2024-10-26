import { getBasicProductDetails } from '~/services/shopify/products';
import type { GraphQL } from '~/types';
import { getPriceList } from '~/services/models/priceList';
import { getPartnershipData } from './getPartnershipData';
import { priceListIdSchema } from '~/schemas/models';
import { getProductWithVariantsFromPriceList } from '~/services/models/product';
import { getBasicVariantDetails } from '~/services/shopify/variants';
import { createMapIdToRestObj, round } from '~/lib/utils';
import { errorHandler } from '~/lib/utils/server';
import type { ProductPropsWithPositions } from '../types';
import { getProductsFormattedWithPositions } from '../util';

async function getInitialProductData(
  priceListId: string,
  graphql: GraphQL,
): Promise<ProductPropsWithPositions[]> {
  try {
    if (priceListId === 'new') {
      return [];
    }
    await priceListIdSchema.validate(priceListId);
    const productsWithVariantsPrisma =
      await getProductWithVariantsFromPriceList(priceListId);

    const shopifyProductIds = productsWithVariantsPrisma.map(
      ({ shopifyProductId }) => shopifyProductId,
    );
    const shopifyVariantIds = productsWithVariantsPrisma.flatMap(
      ({ variants }) =>
        variants.map(({ shopifyVariantId }) => shopifyVariantId),
    );

    const [shopifyProductBasicInfo, shopifyVariantBasicInfo] =
      await Promise.all([
        getBasicProductDetails(
          shopifyProductIds,
          shopifyProductIds.length,
          graphql,
        ),
        getBasicVariantDetails(
          shopifyVariantIds,
          shopifyVariantIds.length,
          graphql,
        ),
      ]);

    const shopifyIdToRestBasicInfoMap = createMapIdToRestObj(
      shopifyProductBasicInfo,
      'productId',
    );
    const variantIdToRestBasicInfoMap = createMapIdToRestObj(
      shopifyVariantBasicInfo,
      'id',
    );

    const productDetails = productsWithVariantsPrisma.map((product) => {
      const productGraphQLInfo = shopifyIdToRestBasicInfoMap.get(
        product.shopifyProductId,
      );
      if (!productGraphQLInfo) {
        throw new Error('Product should have its information fetched.');
      }
      return {
        id: product.shopifyProductId,
        title: productGraphQLInfo.title,
        images: [
          {
            id: productGraphQLInfo.mediaId ?? '',
            altText: productGraphQLInfo.mediaAlt ?? '',
            originalSrc: productGraphQLInfo.mediaImageUrl ?? '',
          },
        ],
        storeUrl: productGraphQLInfo.onlineStoreUrl,
        totalVariants: productGraphQLInfo.variantsCount,
        variants: product.variants.map((variant) => {
          const variantGraphQLInfo = variantIdToRestBasicInfoMap.get(
            variant.shopifyVariantId,
          );
          if (!variantGraphQLInfo) {
            throw new Error('Variant should have its information fetched.');
          }

          return {
            id: variant.shopifyVariantId,
            title: variantGraphQLInfo.title,
            price: variant.retailPrice,
            wholesalePrice: round(Number(variant.supplierProfit), 2), // should be possible to be null
            sku: variantGraphQLInfo.sku,
            inventoryItem: {
              id: variant.inventoryItem?.shopifyInventoryItemId ?? '',
            },
          };
        }),
      };
    });

    const profileDetailsWithPosition =
      getProductsFormattedWithPositions(productDetails);
    return profileDetailsWithPosition;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get product data from price list.',
      getInitialProductData,
      { priceListId },
    );
  }
}

export async function getExistingPriceListData(
  sessionId: string,
  priceListId: string,
  graphql: GraphQL,
) {
  try {
    const [productsData, settingsData, partnershipsData] = await Promise.all([
      getInitialProductData(priceListId, graphql),
      getPriceList(priceListId),
      getPartnershipData(sessionId, priceListId),
    ]);

    return { productsData, settingsData, partnershipsData };
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get existing price list data.',
      getExistingPriceListData,
      { priceListId },
    );
  }
}
