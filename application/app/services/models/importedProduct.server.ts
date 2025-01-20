import type { Prisma } from '@prisma/client';
import db from '~/db.server';

export async function isImportedProduct(
  shopifyProductId: string,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.importedProduct.count({
    where: { shopifyProductId },
  });
  return count > 0;
}
