import type { Prisma } from '@prisma/client';
import { errorHandler } from '../util';
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
      addProductsTx,
      { sessionId, priceListId, shopifyProductIdsToAdd },
    );
  }
}

export async function getProductWithVariantsFromPriceList(
  priceListId: string,
): Promise<ProductWithVariants[]> {
  try {
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
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get products with variants from price list.',
      getProductWithVariantsFromPriceList,
      { priceListId },
    );
  }
}

export async function getAllProductDetails(
  productId: string,
): Promise<AllProductDetails> {
  try {
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
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get product details for product creation.',
      getAllProductDetails,
      { productId },
    );
  }
}

export async function updateStoreStatus(
  sessionId: string,
  isInstalled: boolean,
) {
  try {
    await db.session.update({
      where: {
        id: sessionId,
      },
      data: {
        isAppUninstalled: false,
      },
    });
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to update store status.',
      updateStoreStatus,
      {
        sessionId,
        isInstalled,
      },
    );
  }
}
