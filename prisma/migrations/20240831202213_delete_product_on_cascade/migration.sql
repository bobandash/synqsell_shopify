-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_priceListId_fkey";

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
