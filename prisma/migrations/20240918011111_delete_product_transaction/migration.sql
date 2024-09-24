/*
  Warnings:

  - You are about to drop the `ImportedProductTransaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ImportedInventoryItem" DROP CONSTRAINT "ImportedInventoryItem_prismaInventoryItemId_fkey";

-- DropForeignKey
ALTER TABLE "ImportedProductTransaction" DROP CONSTRAINT "ImportedProductTransaction_importedProductId_fkey";

-- DropForeignKey
ALTER TABLE "ImportedVariant" DROP CONSTRAINT "ImportedVariant_prismaVariantId_fkey";

-- DropTable
DROP TABLE "ImportedProductTransaction";

-- AddForeignKey
ALTER TABLE "ImportedVariant" ADD CONSTRAINT "ImportedVariant_prismaVariantId_fkey" FOREIGN KEY ("prismaVariantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedInventoryItem" ADD CONSTRAINT "ImportedInventoryItem_prismaInventoryItemId_fkey" FOREIGN KEY ("prismaInventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
