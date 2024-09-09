import type { Prisma } from '@prisma/client';
import { errorHandler } from '../util';
import type { GraphQL } from '~/types';
import db from '~/db.server';

export async function hasProduct(id: string) {
  try {
    const product = await db.product.findFirst({
      where: {
        id,
      },
    });

    if (product) {
      return true;
    }
    return false;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if product exists.',
      hasProduct,
      { id },
    );
  }
}

export async function deleteProductsTx(
  tx: Prisma.TransactionClient,
  priceListId: string,
  prismaProductIds: string[],
) {
  try {
    const deletedProducts = await tx.product.deleteMany({
      where: {
        priceListId,
        id: {
          in: prismaProductIds,
        },
      },
    });
    return deletedProducts;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to delete products from price list.',
      deleteProductsTx,
      { priceListId, prismaProductIds },
    );
  }
}

export async function addProductsTx(
  tx: Prisma.TransactionClient,
  sessionId: string,
  priceListId: string,
  shopifyProductIdsToAdd: string[],
) {
  try {
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
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to add products to price list.',
      deleteProductsTx,
      { sessionId, priceListId, shopifyProductIdsToAdd },
    );
  }
}

// helper function to map shopify's product id field to created product's is field in prisma
export async function getMapShopifyProductIdToPrismaIdTx(
  tx: Prisma.TransactionClient,
  productIds: string[],
  priceListId: string,
) {
  const idAndProductIds = await tx.product.findMany({
    where: {
      shopifyProductId: {
        in: productIds,
      },
      priceListId,
    },
    select: {
      id: true,
      shopifyProductId: true,
    },
  });

  const shopifyProductIdToPrismaId = new Map<string, string>();
  idAndProductIds.forEach(({ id, shopifyProductId }) => {
    shopifyProductIdToPrismaId.set(shopifyProductId, id);
  });
  return shopifyProductIdToPrismaId;
}

export async function getProductDetailsForProductCreation(productId: string) {
  try {
    const productDetails = await db.product.findFirstOrThrow({
      where: {
        id: productId,
      },
      include: {
        priceList: true,
        images: true,
        variants: {
          include: {
            inventoryItem: true,
            variantOptions: true,
          },
        },
      },
    });
    return productDetails;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get product details for product creation.',
      getProductDetailsForProductCreation,
      { productId },
    );
  }
}
