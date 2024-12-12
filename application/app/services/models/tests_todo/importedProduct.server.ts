import db from '~/db.server';

export async function isImportedProduct(shopifyProductId: string) {
  const importedProduct = await db.importedProduct.findFirst({
    where: {
      shopifyProductId,
    },
  });
  return importedProduct !== null;
}
