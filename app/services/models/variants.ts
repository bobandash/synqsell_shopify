import type { Prisma } from '@prisma/client';
import { errorHandler } from '../util';

export type BasicVariantInfoWithoutVariantId = {
  wholesalePrice: number | null;
  prismaProductId: string;
};

export type BasicVariantInfo = {
  variantId: string;
  wholesalePrice: number | null;
  prismaProductId: string;
};

type AddVariantProps = Omit<Prisma.VariantGetPayload<{}>, 'id'>;

export type BasicVariantInfoWithPrismaId = BasicVariantInfo & {
  prismaId: string;
};

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
          variants: {
            select: {
              id: true,
              shopifyVariantId: true,
            },
          },
        },
      })
    ).flatMap(({ variants }) =>
      variants.map(({ id, shopifyVariantId }) => {
        return { id, shopifyVariantId };
      }),
    );
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

export async function addVariantsTx(
  tx: Prisma.TransactionClient,
  variants: AddVariantProps[],
) {
  try {
    const createdVariants = await tx.variant.createManyAndReturn({
      data: variants,
    });
    return createdVariants;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to add variants in bulk.',
      addVariantsTx,
      { variants },
    );
  }
}

export async function deleteVariantsTx(
  tx: Prisma.TransactionClient,
  variantIds: string[],
) {
  try {
    const deletedVariants = await tx.variant.deleteMany({
      where: {
        id: {
          in: variantIds,
        },
      },
    });
    return deletedVariants;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to remove variants in transaction.',
      deleteVariantsTx,
      {
        variantIds,
      },
    );
  }
}

export async function updateVariantsTx(
  tx: Prisma.TransactionClient,
  variants: BasicVariantInfoWithPrismaId[],
) {
  try {
    const updatedRecords = await Promise.all([
      variants.map((variant) => {
        const { wholesalePrice, prismaId } = variant;

        return tx.variant.update({
          where: {
            id: prismaId,
          },
          data: {
            wholesalePrice,
          },
        });
      }),
    ]);
    return updatedRecords;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to update variant wholesale price in transaction.',
      deleteVariantsTx,
      {
        variants,
      },
    );
  }
}
