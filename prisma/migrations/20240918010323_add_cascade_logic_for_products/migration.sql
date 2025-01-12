-- DropForeignKey
ALTER TABLE "ImportedInventoryItem" DROP CONSTRAINT "ImportedInventoryItem_importedVariantId_fkey";

-- DropForeignKey
ALTER TABLE "ImportedProduct" DROP CONSTRAINT "ImportedProduct_prismaProductId_fkey";

-- DropForeignKey
ALTER TABLE "ImportedVariant" DROP CONSTRAINT "ImportedVariant_importedProductId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_priceListId_fkey";

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedProduct" ADD CONSTRAINT "ImportedProduct_prismaProductId_fkey" FOREIGN KEY ("prismaProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedVariant" ADD CONSTRAINT "ImportedVariant_importedProductId_fkey" FOREIGN KEY ("importedProductId") REFERENCES "ImportedProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedInventoryItem" ADD CONSTRAINT "ImportedInventoryItem_importedVariantId_fkey" FOREIGN KEY ("importedVariantId") REFERENCES "ImportedVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
