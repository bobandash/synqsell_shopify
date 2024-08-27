import type { Prisma } from '@prisma/client';
import { errorHandler } from '../util';
import type { GraphQL } from '~/types';
import { getRelevantProductInformationForPrisma } from '../shopify/products';

export async function deleteProductsTx(
  tx: Prisma.TransactionClient,
  priceListId: string,
  productIds: string[],
) {
  try {
    const deletedProducts = await tx.product.deleteMany({
      where: {
        priceListId,
        productId: {
          in: productIds,
        },
      },
    });
    return deletedProducts;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to delete products from price list.',
      deleteProductsTx,
      { priceListId, productIds },
    );
  }
}

export async function addProductsTx(
  tx: Prisma.TransactionClient,
  sessionId: string,
  priceListId: string,
  productsToAdd: string[],
  graphql: GraphQL,
) {
  try {
    const productsFmt = await getRelevantProductInformationForPrisma(
      productsToAdd,
      sessionId,
      priceListId,
      graphql,
    );
    if (!productsFmt) {
      return null;
    }
    const newProducts = await tx.product.createMany({
      data: productsFmt,
    });
    return newProducts;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to add products to price list.',
      deleteProductsTx,
      { sessionId, priceListId, productsToAdd },
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
      id: {
        in: productIds,
      },
      priceListId,
    },
    select: {
      id: true,
      productId: true,
    },
  });

  const shopifyProductIdToPrismaId = new Map<string, string>();
  idAndProductIds.forEach(({ id, productId }) => {
    shopifyProductIdToPrismaId.set(productId, id);
  });
  return shopifyProductIdToPrismaId;
}
