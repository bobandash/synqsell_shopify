/*
  Warnings:

  - A unique constraint covering the columns `[importedVariantId]` on the table `ImportedInventoryItem` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ImportedInventoryItem_importedVariantId_key" ON "ImportedInventoryItem"("importedVariantId");
