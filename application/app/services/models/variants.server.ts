import type { Prisma } from '@prisma/client';
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
  const variants = await db.variant.findMany({
    where: {
      productId: prismaProductId,
    },
    include: {
      inventoryItem: true,
    },
  });
  return variants;
}

export async function getShopifyVariantIdsInPriceListTx(
  tx: Prisma.TransactionClient,
  priceListId: string,
) {
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
}

export async function addVariantsTx(
  tx: Prisma.TransactionClient,
  variants: AddVariantProps[],
) {
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
}

export async function deleteVariantsTx(
  tx: Prisma.TransactionClient,
  variantIds: string[],
) {
  const deletedVariants = await tx.variant.deleteMany({
    where: {
      id: {
        in: variantIds,
      },
    },
  });
  return deletedVariants;
}

export async function updateVariantsTx(
  tx: Prisma.TransactionClient,
  variants: BasicVariantInfoWithPrismaId[],
) {
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
}
