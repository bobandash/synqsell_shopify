import type { Prisma } from '@prisma/client';
import { errorHandler } from '../util';
export async function getShopifyVariantIdsInPriceListTx(
  tx: Prisma.TransactionClient,
  priceListId: string,
) {
  try {
    const variantIds = (
      await tx.product.findMany({
        where: {
          priceListId,
        },
        include: {
          Variant: {
            select: {
              variantId: true,
            },
          },
        },
      })
    ).flatMap(({ Variant }) => Variant.map(({ variantId }) => variantId));
    return variantIds;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get shopify variant ids from price list',
      getShopifyVariantIdsInPriceListTx,
      {
        priceListId,
      },
    );
  }
}
