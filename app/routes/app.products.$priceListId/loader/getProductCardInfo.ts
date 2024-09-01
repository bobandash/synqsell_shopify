import { boolean, object, string } from 'yup';
import { errorHandler } from '~/services/util';
import db from '~/db.server';
import type { Prisma } from '@prisma/client';
import { isRetailerInPriceList } from '~/services/models/priceListRetailer';
import { hasSession } from '~/services/models/session';

type GetProductCardInfoDbProps = {
  priceListId?: string;
  cursor?: string;
  take: number;
  isReverseDirection: boolean;
};

type GetPaginatedProductCardsInfoProps = {
  priceListId?: string;
  cursor?: string;
  isReverseDirection: boolean;
  sessionId: string;
};

// example of how strong types work in prisma
export type ProductWithImageAndVariant = Prisma.ProductGetPayload<{
  include: {
    images: true;
    variants: true;
    priceList: {
      select: {
        id: true;
        requiresApprovalToImport: true;
        isGeneral: true;
        margin: true;
        session: {
          select: {
            userProfile: {
              select: {
                name: true;
              };
            };
          };
        };
      };
    };
  };
}>;

export type ProductCardData = Prisma.ProductGetPayload<{
  include: {
    images: true;
    variants: true;
  };
}> & {
  brandName: string | null;
  priceList: {
    id: string;
    isGeneral: boolean;
    requiresApprovalToImport?: boolean;
    margin?: number;
  };
};

const getProductCardsSchema = object({
  isReverseDirection: boolean().required(),
  priceListId: string().optional(),
  cursor: string().optional(),
  sessionId: string()
    .required()
    .test(
      'session-id-valid',
      'Session id has to exist in database',
      async (sessionId) => {
        const sessionIdExists = await hasSession(sessionId);
        return sessionIdExists;
      },
    ),
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

async function getProductCardInfoDb({
  priceListId,
  cursor,
  take,
  isReverseDirection,
}: GetProductCardInfoDbProps) {
  try {
    const rawProductsData = await db.product.findMany({
      take: isReverseDirection ? -1 * take : take + 1,
      ...(cursor && { cursor: { id: cursor } }),
      ...(cursor && { skip: 1 }),
      where: {
        ...(priceListId && { priceListId: priceListId }),
      },
      include: {
        images: true,
        variants: true,
        priceList: {
          select: {
            id: true,
            isGeneral: true,
            requiresApprovalToImport: true,
            margin: true,
            session: {
              select: {
                userProfile: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
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
      'Failed to get product cards information.',
      getPaginatedProductCardsInfo,
      { priceListId, cursor, isReverseDirection },
    );
  }
}

async function getNoAccessPriceListIds(
  products: ProductWithImageAndVariant[],
  sessionId: string,
) {
  try {
    const noAccessToSensitiveInfoPriceListIds = new Set<string>();
    for (const product of products) {
      const { priceListId, priceList } = product;
      const { requiresApprovalToImport, isGeneral } = priceList;
      if (noAccessToSensitiveInfoPriceListIds.has(priceListId)) {
        continue;
      }
      if (!isGeneral || (isGeneral && requiresApprovalToImport)) {
        const isPartneredRetailer = await isRetailerInPriceList(
          sessionId,
          priceListId,
        );
        if (!isPartneredRetailer) {
          noAccessToSensitiveInfoPriceListIds.add(priceListId);
        }
      }
    }
    return noAccessToSensitiveInfoPriceListIds;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get private price list ids.',
      getNoAccessPriceListIds,
      { products, sessionId },
    );
  }
}

// Hide wholesale price (aka profit) and margin if the retailer doesn't have access to the price list
// Two cases for not having access: not being a partnered retailer in "closed" generic price list or private price list
const formatProductDataForPriceList = async (
  products: ProductWithImageAndVariant[],
  sessionId: string,
) => {
  try {
    const noAccessPriceListIds = await getNoAccessPriceListIds(
      products,
      sessionId,
    );

    return products.map(
      ({ images, priceList, variants, priceListId, ...rest }) => {
        return {
          images: images.sort((a, b) => a.position - b.position),
          brandName: priceList.session.userProfile?.name,
          priceList: {
            id: priceList.id,
            isGeneral: priceList.isGeneral,
            requiresApprovalToImport: priceList.requiresApprovalToImport,
            margin: noAccessPriceListIds.has(priceList.id)
              ? null
              : priceList.margin,
          },
          variants: variants.map(({ wholesalePrice, ...rest }) => {
            return {
              ...rest,
              wholesalePrice: noAccessPriceListIds.has(priceList.id)
                ? null
                : wholesalePrice,
            };
          }),
          ...rest,
        };
      },
    );
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to clean up product data format.',
      formatProductDataForPriceList,
      { products, sessionId },
    );
  }
};

// made this into an object to have easier control on when to pass params
export async function getPaginatedProductCardsInfo({
  priceListId,
  cursor,
  isReverseDirection,
  sessionId,
}: GetPaginatedProductCardsInfoProps) {
  try {
    await getProductCardsSchema.validate({
      isReverseDirection,
      cursor,
      priceListId,
      sessionId,
    });
    // retrieve first product id in order to check if there's any elements in previous
    const firstProductId = (
      await getProductCardInfoDb({
        priceListId,
        take: 1,
        isReverseDirection: false,
      })
    ).products[0].id;
    const { products, nextCursor } = await getProductCardInfoDb({
      priceListId,
      cursor,
      take: 16,
      isReverseDirection,
    });
    const formattedProducts = await formatProductDataForPriceList(
      products,
      sessionId,
    );
    const hasPrevious = products[0].id !== firstProductId;
    const prevCursor = !hasPrevious ? null : products[0].id;
    return { products: formattedProducts, nextCursor, prevCursor };
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get product cards information.',
      getPaginatedProductCardsInfo,
      { priceListId, cursor, isReverseDirection },
    );
  }
}
