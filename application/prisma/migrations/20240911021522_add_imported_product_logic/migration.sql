/*
  Warnings:

  - Added the required column `shopifyVariantId` to the `ImportedVariant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ImportedVariant" ADD COLUMN     "shopifyVariantId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ImportedInventoryItem" (
    "id" TEXT NOT NULL,
    "shopifyInventoryItemId" TEXT NOT NULL,
    "importedVariantId" TEXT NOT NULL,
    "prismaInventoryItemId" TEXT NOT NULL,

    CONSTRAINT "ImportedInventoryItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ImportedInventoryItem" ADD CONSTRAINT "ImportedInventoryItem_prismaInventoryItemId_fkey" FOREIGN KEY ("prismaInventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedInventoryItem" ADD CONSTRAINT "ImportedInventoryItem_importedVariantId_fkey" FOREIGN KEY ("importedVariantId") REFERENCES "ImportedVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
