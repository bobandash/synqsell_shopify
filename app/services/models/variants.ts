import type { Prisma } from '@prisma/client';
import { errorHandler } from '../util';
import db from '~/db.server';

export type BasicVariantInfoWithoutVariantId = {
  wholesalePrice: number | null;
  prismaProductId: string;
};

export type BasicVariantInfo = {
  productId: string;
  shopifyVariantId: string;
  retailPrice: string;
  retailerPayment: string;
  supplierProfit: string;
};

type AddVariantProps = Omit<Prisma.VariantGetPayload<{}>, 'id'>;

export type BasicVariantInfoWithPrismaId = BasicVariantInfo & {
  id: string;
};

export async function getProductVariantsWithInventoryItem(
  prismaProductId: string,
) {
  try {
    const variants = await db.variant.findMany({
      where: {
        productId: prismaProductId,
      },
      include: {
        inventoryItem: true,
      },
    });
    return variants;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get variants with inventory items from product.',
      getProductVariantsWithInventoryItem,
      {
        prismaProductId,
      },
    );
  }
}

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
    console.log(variantIds);
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
        const { id, ...rest } = variant;
        return tx.variant.update({
          where: {
            id,
          },
          data: {
            ...rest,
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
