import { errorHandler } from '~/lib/utils/server';
import db from '~/db.server';

export async function hasRetailerImportedProduct(
  retailerId: string,
  prismaProductId: string,
) {
  try {
    const importedProduct = await db.importedProduct.findFirst({
      where: {
        retailerId,
        prismaProductId,
      },
    });
    if (importedProduct) {
      return true;
    }
    return false;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if retailer imported product.',
      hasRetailerImportedProduct,
      { retailerId, prismaProductId },
    );
  }
}

export async function isImportedProduct(shopifyProductId: string) {
  try {
    const importedProduct = await db.importedProduct.findFirst({
      where: {
        shopifyProductId,
      },
    });
    return importedProduct !== null;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if product is an imported product.',
      isImportedProduct,
      { shopifyProductId },
    );
  }
}
