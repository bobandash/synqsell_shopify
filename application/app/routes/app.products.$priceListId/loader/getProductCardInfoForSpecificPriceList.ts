import { boolean, object, string } from 'yup';
import type { Prisma } from '@prisma/client';
import { priceListIdSchema, sessionIdSchema } from '~/schemas/models';
import db from '~/db.server';
import { getProductStatus } from './util';
import {
  getPriceList,
  getRetailerIds,
} from '~/services/models/priceList.server';
import { getProfile } from '~/services/models/userProfile.server';
import { getBasicProductDetailsWithAccessToken } from '~/services/shopify/products';
import { createMapIdToRestObj, getCurrencySign } from '~/lib/utils';
import type { ProductCard } from '../types';
import type { CurrencyCode } from '~/types/admin.types';
import { hasPartnershipRequest } from '~/services/models/partnershipRequest.server';
import { PARTNERSHIP_REQUEST_TYPE } from '~/constants';
import { getSession } from '~/services/models/session.server';

type GetPaginatedProductCardsInfoProps = {
  priceListId: string;
  cursor?: string;
  isReverseDirection: boolean;
  sessionId: string;
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

const hasRetailerAccessToImportPriceListSchema = object({
  priceListId: priceListIdSchema,
  sessionId: sessionIdSchema,
});

// check if user has permission to view the price list
async function hasAccessToImportPriceList(
  priceListId: string,
  sessionId: string,
) {
  await hasRetailerAccessToImportPriceListSchema.validate({
    priceListId,
    sessionId,
  });
  const requiresApprovalToImport = (await getPriceList(priceListId))
    .requiresApprovalToImport;
  const retailerIds = await getRetailerIds(priceListId);
  if (!requiresApprovalToImport || retailerIds.includes(sessionId)) {
    return true;
  }
  return false;
}

export async function getProductCardInfoFromPriceList(
  props: GetPaginatedProductCardsInfoProps,
): Promise<ProductCardInfoFromPriceList> {
  const { priceListId, cursor, isReverseDirection, sessionId } = props;
  await getProductCardsSchema.validate(props);
  const { products, nextCursor } = await getProductsWithVariantsSorted({
    priceListId,
    cursor,
    isReverseDirection,
    take: 16,
  });

  const [hasAccessToImport, priceList, supplierDetails] = await Promise.all([
    hasAccessToImportPriceList(priceListId, sessionId),
    getPriceList(priceListId),
    getSupplierDetails(priceListId),
  ]);

  const supplierId = priceList.supplierId;
  const { shop, accessToken } = await getSession(supplierId);

  // need to fetch misc data from shopify to render
  const shopifyProductIds = products.map(
    ({ shopifyProductId }) => shopifyProductId,
  );

  const shopifyProductDetails = await getBasicProductDetailsWithAccessToken(
    shopifyProductIds,
    shopifyProductIds.length,
    shop,
    accessToken,
  );
  const mapShopifyProductIdToProductDetails = createMapIdToRestObj(
    shopifyProductDetails,
    'productId',
  );

  const prismaProductIdsImportedByRetailer = await getImportedPrismaProductIds(
    sessionId,
    priceListId,
  );
  const prismaProductIdsImportedByRetailerSet = new Set(
    prismaProductIdsImportedByRetailer,
  );
  const partnershipRequestExists = await hasPartnershipRequest(
    priceListId,
    sessionId,
    PARTNERSHIP_REQUEST_TYPE.RETAILER,
  );

  // when there's no access to import, we have to hide the pricing
  const productsFormatted = products.map(
    ({ variants, shopifyProductId, id, ...rest }) => {
      const productDetails =
        mapShopifyProductIdToProductDetails.get(shopifyProductId);
      if (!productDetails) {
        throw new Error('Shopify product details is missing for product card.');
      }
      return {
        id,
        ...rest,
        ...productDetails,
        variants: variants.map(
          ({ retailPrice, retailerPayment, supplierProfit, ...rest }) => {
            return {
              ...rest,
              shopifyProductId,
              retailPrice: retailPrice,
              retailerPayment: hasAccessToImport ? retailerPayment : null,
              supplierProfit: hasAccessToImport ? supplierProfit : null,
            };
          },
        ),
        brandName: supplierDetails.brandName,
        currencySign: supplierDetails.currencySign,
        productStatus: getProductStatus(
          prismaProductIdsImportedByRetailerSet.has(id),
          partnershipRequestExists,
          hasAccessToImport,
        ),
      };
    },
  );

  const currFirstProductIdInView = productsFormatted[0]
    ? productsFormatted[0].id
    : null;
  const prevCursor = await getPrevCursor(currFirstProductIdInView, priceListId);
  return { products: productsFormatted, nextCursor, prevCursor };
}

// helper functions for retrieving product card info
async function getProductsWithVariantsSorted(
  props: GetProductsWithVariantsProps,
) {
  const { priceListId, cursor, take, isReverseDirection } = props;
  const rawProductsData = await db.product.findMany({
    where: {
      priceListId,
    },
    include: {
      variants: true,
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], // id is to ensure consistent ordering in case product was created at same time
    take: isReverseDirection ? -1 * take : take + 1,
    ...(cursor !== undefined && { cursor: { id: cursor } }),
    ...(cursor !== undefined && { skip: 1 }),
  });
  const hasMore = rawProductsData.length > take || isReverseDirection;
  const products =
    !isReverseDirection && hasMore
      ? rawProductsData.slice(0, -1)
      : rawProductsData;
  const nextCursor = hasMore ? products[take - 1].id : null;
  return { products, nextCursor };
}

async function getSupplierDetails(priceListId: string) {
  const priceList = await getPriceList(priceListId);
  const supplierId = priceList.supplierId;
  const profile = await getProfile(supplierId);
  const { currencyCode, name } = profile;
  const currencySign = getCurrencySign(currencyCode as CurrencyCode);
  return { brandName: name, currencySign: currencySign };
}

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

// used to check if retailer imported the product already
async function getImportedPrismaProductIds(
  retailerId: string,
  priceListId: string,
) {
  const products = await db.product.findMany({
    where: {
      priceListId,
    },
    select: {
      id: true,
    },
  });
  const productIds = products.map(({ id }) => id);
  const importedProducts = await db.importedProduct.findMany({
    where: {
      prismaProductId: {
        in: productIds,
      },
      retailerId,
    },
    select: {
      prismaProductId: true,
    },
  });
  const prismaProductIds = importedProducts.map(
    ({ prismaProductId }) => prismaProductId,
  );
  return prismaProductIds;
}
