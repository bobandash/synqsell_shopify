import { string } from 'yup';
import { errorHandler } from '~/services/util';
import db from '~/db.server';
import { getIdMappedToStoreUrl } from '~/services/shopify/products';
import type { GraphQL } from '~/types';
import { getPriceListSettings } from '~/services/models/priceList';

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
        Image: true,
        Variant: {
          include: {
            InventoryItem: true,
            VariantOption: true,
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
      const { productId, title, variantsCount, Variant, Image } = product;
      // totalVariants is deprecated in graphql but not deprecated in the admin picker
      return {
        id: productId,
        title,
        storeUrl: productIdToStoreUrl[productId] ?? '',
        position: index,
        totalVariants: variantsCount,
        images: Image.map((image) => {
          return {
            id: image.id,
            altText: image.alt,
            originalSrc: image.url,
          };
        }),
        variants: Variant.map(
          (
            { variantId, price, wholesalePrice, InventoryItem, VariantOption },
            index,
          ) => {
            const title = VariantOption.map(({ value }) => value).join(' ');
            return {
              id: variantId,
              title,
              sku: InventoryItem?.sku ?? null,
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
    const [productsData, settingsData] = await Promise.all([
      getInitialProductData(priceListId, sessionId, graphql),
      getPriceListSettings(sessionId, priceListId),
    ]);

    return { productsData, settingsData };
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get existing price list data.',
      getInitialProductData,
      { priceListId },
    );
  }
}
