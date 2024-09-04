import { string } from 'yup';
import { errorHandler } from '~/services/util';
import db from '~/db.server';
import { getIdMappedToStoreUrl } from '~/services/shopify/products';
import type { GraphQL } from '~/types';
import { getPriceListSettings } from '~/services/models/priceList';
import { getPartnershipData } from './getPartnershipData';

const isValidPriceListIdSchema = string()
  .required()
  .test(
    'is-valid-price-list-id',
    'Price list id is not valid',
    async (value) => {
      if (value === 'new') {
        return true;
      }
      const priceList = await db.priceList.findFirst({
        where: {
          id: value,
        },
      });
      if (priceList) {
        return true;
      }
      return false;
    },
  );

// fetches initial product data from loader
async function getInitialProductData(
  priceListId: string,
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    await isValidPriceListIdSchema.validate(priceListId);
    if (priceListId === 'new') {
      return [];
    }

    const rawProductsData = await db.product.findMany({
      where: {
        priceListId,
      },
      include: {
        images: true,
        variants: {
          include: {
            inventoryItem: true,
            variantOptions: true,
          },
        },
      },
    });
    const productIds = rawProductsData.map(({ id }) => id);
    const productIdToStoreUrl = (await getIdMappedToStoreUrl(
      graphql,
      sessionId,
      productIds,
    )) as { [key: string]: string };

    const cleanProductsData = rawProductsData.map((product, index) => {
      const { shopifyProductId, title, variantsCount, variants, images } =
        product;
      // totalVariants is deprecated in graphql but not deprecated in the admin picker
      return {
        id: shopifyProductId,
        title,
        storeUrl: productIdToStoreUrl[shopifyProductId] ?? '',
        position: index,
        totalVariants: variantsCount,
        images: images.map((image) => {
          return {
            id: image.id,
            altText: image.alt,
            originalSrc: image.url,
          };
        }),
        variants: variants.map(
          (
            {
              shopifyVariantId,
              price,
              wholesalePrice,
              inventoryItem,
              variantOptions,
            },
            index,
          ) => {
            const title = variantOptions.map(({ value }) => value).join(' ');
            return {
              id: shopifyVariantId,
              title,
              sku: inventoryItem?.sku ?? null,
              price,
              wholesalePrice,
              position: index,
            };
          },
        ),
      };
    });

    return cleanProductsData;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get product data for price list form.',
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
      getInitialProductData(priceListId, sessionId, graphql),
      getPriceListSettings(sessionId, priceListId),
      getPartnershipData(sessionId, priceListId),
    ]);

    return { productsData, settingsData, partnershipsData };
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get existing price list data.',
      getInitialProductData,
      { priceListId },
    );
  }
}
