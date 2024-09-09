import { boolean, object, string } from 'yup';
import { errorHandler } from '~/services/util';
import type { Prisma } from '@prisma/client';
import { priceListIdSchema, sessionIdSchema } from '~/schemas/models';
import db from '~/db.server';
import { hasAccessToImportPriceList } from './util';
import { getPriceList } from '~/services/models/priceList';
import { getProfile } from '~/services/models/userProfile';
import { getBasicProductDetails } from '~/services/shopify/products';
import type { GraphQL } from '~/types';
import { createMapIdToRestObj } from '~/routes/util';
import type { ProductCard } from '../types';

type GetPaginatedProductCardsInfoProps = {
  priceListId: string;
  cursor?: string;
  isReverseDirection: boolean;
  sessionId: string;
  graphql: GraphQL;
};

type GetProductsWithVariantsProps = {
  priceListId: string;
  cursor?: string;
  isReverseDirection: boolean;
  take: number;
};

export type FulfillmentService = Prisma.FulfillmentServiceGetPayload<{}>;

type ProductCardInfoFromPriceList = {
  products: ProductCard[];
  nextCursor: string | null;
  prevCursor: string | null;
};

// helper functions for retrieving product card info
async function getProductsWithVariantsSorted(
  props: GetProductsWithVariantsProps,
) {
  const { priceListId, cursor, take, isReverseDirection } = props;
  try {
    const rawProductsData = await db.product.findMany({
      where: {
        priceListId,
      },
      include: {
        variants: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: isReverseDirection ? -1 * take : take + 1,
      ...(cursor && { cursor: { id: cursor } }),
      ...(cursor && { skip: 1 }),
    });
    const hasMore = rawProductsData.length > take || isReverseDirection;
    const products =
      !isReverseDirection && hasMore
        ? rawProductsData.slice(0, -1)
        : rawProductsData;
    const nextCursor = hasMore ? products[take - 1].id : null;
    return { products, nextCursor };
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get products with variants from price list.',
      getProductsWithVariantsSorted,
      { priceListId },
    );
  }
}

async function getBrandName(priceListId: string) {
  try {
    const priceList = await getPriceList(priceListId);
    const supplierId = priceList.supplierId;
    const brandName = (await getProfile(supplierId)).name;
    return brandName;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get products with variants from price list.',
      getBrandName,
      { priceListId },
    );
  }
}

// TODO: add currency code, pretty sure this is set in profile
const getProductCardsSchema = object({
  isReverseDirection: boolean().required(),
  priceListId: priceListIdSchema,
  cursor: string().optional(),
  sessionId: sessionIdSchema,
}).test(
  'is-reverse-direction-not-true',
  'Cannot fetch information from reverse direction if cursor is not provided',
  (values) => {
    const { isReverseDirection, cursor } = values;
    if (!cursor && isReverseDirection) {
      return false;
    }
    return true;
  },
);

async function getPrevCursor(
  currFirstProductIdInView: string | null,
  priceListId: string,
) {
  const { products } = await getProductsWithVariantsSorted({
    priceListId,
    isReverseDirection: false,
    take: 1,
  });
  const hasPrevious =
    products.length > 0 && products[0].id !== currFirstProductIdInView;
  const prevCursor = hasPrevious ? currFirstProductIdInView : null;
  return prevCursor;
}

export async function getProductCardInfoFromPriceList(
  props: GetPaginatedProductCardsInfoProps,
): Promise<ProductCardInfoFromPriceList> {
  const { priceListId, cursor, isReverseDirection, sessionId, graphql } = props;
  try {
    await getProductCardsSchema.validate(props);
    const { products, nextCursor } = await getProductsWithVariantsSorted({
      priceListId,
      cursor,
      isReverseDirection,
      take: 16,
    });
    const hasAccessToImport = await hasAccessToImportPriceList(
      priceListId,
      sessionId,
    );
    const supplierBrandName = await getBrandName(priceListId);

    // need to fetch misc data from shopify to render
    const shopifyProductIds = products.map(
      ({ shopifyProductId }) => shopifyProductId,
    );
    const shopifyProductDetails = await getBasicProductDetails(
      shopifyProductIds,
      shopifyProductIds.length,
      graphql,
    );
    const mapShopifyProductIdToProductDetails = createMapIdToRestObj(
      shopifyProductDetails,
      'productId',
    );
    // when there's no access to import, we have to hide the pricing
    const productsFormatted = products.map(
      ({ variants, shopifyProductId, ...rest }) => {
        const productDetails =
          mapShopifyProductIdToProductDetails.get(shopifyProductId);
        if (!productDetails) {
          throw new Error(
            'Shopify product details is missing for product card.',
          );
        }
        return {
          ...rest,
          ...productDetails,
          priceListId,
          variants: variants.map(
            ({ retailPrice, retailerPayment, supplierProfit, ...rest }) => {
              return {
                ...rest,
                shopifyProductId,
                retailPrice: hasAccessToImport ? retailPrice : null,
                retailerPayment: hasAccessToImport ? retailerPayment : null,
                supplierProfit: hasAccessToImport ? supplierProfit : null,
              };
            },
          ),
          brandName: supplierBrandName,
        };
      },
    );

    const currFirstProductIdInView = productsFormatted[0]
      ? productsFormatted[0].id
      : null;
    const prevCursor = await getPrevCursor(
      currFirstProductIdInView,
      priceListId,
    );

    return { products: productsFormatted, nextCursor, prevCursor };
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get product cards information.',
      getProductCardInfoFromPriceList,
      { priceListId, cursor, isReverseDirection },
    );
  }
}
