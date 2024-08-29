import { boolean, object, string } from 'yup';
import { errorHandler } from '~/services/util';
import db from '~/db.server';
import type { Prisma } from '@prisma/client';

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
};

// example of how strong types work in prisma
export type ProductWithImageAndVariant = Prisma.ProductGetPayload<{
  include: {
    images: true;
    variants: true;
    priceList: {
      select: {
        id: true;
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
}> & { brandName: string | null };

const getProductCardsSchema = object({
  isReverseDirection: boolean().required(),
  priceListId: string().optional(),
  cursor: string().optional(),
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

const formatProductDataForPriceList = (
  products: ProductWithImageAndVariant[],
) => {
  return products.map(({ images, priceList, ...rest }) => {
    return {
      images: images.sort((a, b) => a.position - b.position),
      brandName: priceList.session.userProfile?.name,
      ...rest,
    };
  });
};

// made this into an object to have easier control on when to pass params
export async function getPaginatedProductCardsInfo({
  priceListId,
  cursor,
  isReverseDirection,
}: GetPaginatedProductCardsInfoProps) {
  try {
    await getProductCardsSchema.validate({
      isReverseDirection,
      cursor,
      priceListId,
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
      take: 12,
      isReverseDirection,
    });
    const formattedProducts = formatProductDataForPriceList(products);
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
