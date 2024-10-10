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

type AddVariantProps = Omit<Prisma.VariantGetPayload<{}>, 'id'> & {
  inventoryItem: {
    shopifyInventoryItemId: string;
  };
};

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
  // variants always have a one to one relationship with inventoryItemId, so it's better to just include it
  try {
    // prisma does not support nested writes with createMany
    const variantsData = variants.map(({ inventoryItem, ...rest }) => {
      return {
        ...rest,
      };
    });
    const createdVariants = await tx.variant.createManyAndReturn({
      data: variantsData,
    });
    const inventoryItemData = variants.map(({ inventoryItem }, index) => {
      return {
        shopifyInventoryItemId: inventoryItem.shopifyInventoryItemId,
        variantId: createdVariants[index].id,
      };
    });
    await tx.inventoryItem.createMany({
      data: inventoryItemData,
    });
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
