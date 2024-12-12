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

export async function hasProduct(id: string) {
  const product = await db.product.findFirst({
    where: {
      id,
    },
  });

  return product !== null;
}

export async function deleteProductsTx(
  tx: Prisma.TransactionClient,
  priceListId: string,
  prismaProductIds: string[],
) {
  const deletedProducts = await tx.product.deleteMany({
    where: {
      priceListId,
      id: {
        in: prismaProductIds,
      },
    },
  });
  return deletedProducts;
}

export async function addProductsTx(
  tx: Prisma.TransactionClient,
  priceListId: string,
  shopifyProductIdsToAdd: string[],
) {
  const newProducts = await Promise.all(
    shopifyProductIdsToAdd.map((shopifyProductId) =>
      tx.product.create({
        data: {
          shopifyProductId,
          priceListId,
        },
      }),
    ),
  );
  return newProducts;
}

export async function getProductWithVariantsFromPriceList(
  priceListId: string,
): Promise<ProductWithVariants[]> {
  const products = await db.product.findMany({
    where: {
      priceListId,
    },
    include: {
      variants: {
        include: {
          inventoryItem: true,
        },
      },
    },
  });
  return products;
}

export async function getAllProductDetails(
  productId: string,
): Promise<AllProductDetails> {
  const productDetails = await db.product.findFirstOrThrow({
    where: {
      id: productId,
    },
    include: {
      priceList: true,
      variants: {
        include: {
          inventoryItem: true,
        },
      },
    },
  });
  return productDetails;
}

export async function updateStoreStatus(
  sessionId: string,
  isInstalled: boolean,
) {
  await db.session.update({
    where: {
      id: sessionId,
    },
    data: {
      isAppUninstalled: !isInstalled,
    },
  });
}
