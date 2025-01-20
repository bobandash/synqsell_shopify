import type { Prisma } from '@prisma/client';
import db from '~/db.server';

export type ProductWithVariants = Prisma.ProductGetPayload<{
  include: {
    variants: {
      include: {
        inventoryItem: true;
      };
    };
  };
}>;

export type AllProductDetails = Prisma.ProductGetPayload<{
  include: {
    priceList: true;
    variants: {
      include: {
        inventoryItem: true;
      };
    };
  };
}>;

export async function hasProduct(
  id: string,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.product.count({
    where: { id },
  });
  return count > 0;
}

export async function deleteProducts(
  priceListId: string,
  prismaProductIds: string[],
  tx: Prisma.TransactionClient = db,
) {
  return tx.product.deleteMany({
    where: {
      priceListId,
      id: { in: prismaProductIds },
    },
  });
}

export async function addProducts(
  priceListId: string,
  shopifyProductIdsToAdd: string[],
  tx: Prisma.TransactionClient = db,
) {
  const hasProducts =
    (await tx.product.count({
      where: {
        shopifyProductId: { in: shopifyProductIdsToAdd },
        priceListId,
      },
    })) > 0;

  if (hasProducts) {
    throw new Error('Cannot add duplicate products to price list.');
  }

  return Promise.all(
    shopifyProductIdsToAdd.map((shopifyProductId) =>
      tx.product.create({
        data: {
          shopifyProductId,
          priceListId,
        },
      }),
    ),
  );
}

export async function getProductWithVariantsFromPriceList(
  priceListId: string,
  tx: Prisma.TransactionClient = db,
): Promise<ProductWithVariants[]> {
  return tx.product.findMany({
    where: { priceListId },
    include: {
      variants: {
        include: {
          inventoryItem: true,
        },
      },
    },
  });
}

export async function getAllProductDetails(
  productId: string,
  tx: Prisma.TransactionClient = db,
): Promise<AllProductDetails> {
  return tx.product.findFirstOrThrow({
    where: { id: productId },
    include: {
      priceList: true,
      variants: {
        include: {
          inventoryItem: true,
        },
      },
    },
  });
}

export async function updateStoreStatus(
  sessionId: string,
  isInstalled: boolean,
  tx: Prisma.TransactionClient = db,
) {
  return tx.session.update({
    where: { id: sessionId },
    data: { isAppUninstalled: !isInstalled },
  });
}
