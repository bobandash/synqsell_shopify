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
export async function getShopifyVariantIdsInPriceList(
  priceListId: string,
  tx: Prisma.TransactionClient = db,
) {
  const products = await tx.product.findMany({
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
  });

  return products.flatMap(({ variants }) =>
    variants.map(({ id, shopifyVariantId }) => ({ id, shopifyVariantId })),
  );
}

export async function addVariants(
  variants: AddVariantProps[],
  tx: Prisma.TransactionClient = db,
) {
  // prisma does not support nested writes with createMany
  const variantsData = variants.map(({ inventoryItem, ...rest }) => ({
    ...rest,
  }));

  const createdVariants = await tx.variant.createManyAndReturn({
    data: variantsData,
  });

  const inventoryItemData = variants.map(({ inventoryItem }, index) => ({
    shopifyInventoryItemId: inventoryItem.shopifyInventoryItemId,
    variantId: createdVariants[index].id,
  }));
  await tx.inventoryItem.createMany({
    data: inventoryItemData,
  });
}

export async function deleteVariants(
  variantIds: string[],
  tx: Prisma.TransactionClient = db,
) {
  return tx.variant.deleteMany({
    where: {
      id: {
        in: variantIds,
      },
    },
  });
}

export async function updateVariants(
  variants: BasicVariantInfoWithPrismaId[],
  tx: Prisma.TransactionClient = db,
) {
  return Promise.all(
    variants.map(({ id, ...rest }) =>
      tx.variant.update({
        where: { id },
        data: rest,
      }),
    ),
  );
}
