/*
  Warnings:

  - You are about to drop the `PriceListRetailer` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PriceList" DROP CONSTRAINT "PriceList_partnershipId_fkey";

-- DropForeignKey
ALTER TABLE "PriceListRetailer" DROP CONSTRAINT "PriceListRetailer_priceListId_fkey";

-- DropForeignKey
ALTER TABLE "PriceListRetailer" DROP CONSTRAINT "PriceListRetailer_retailerId_fkey";

-- DropTable
DROP TABLE "PriceListRetailer";

-- CreateTable
CREATE TABLE "_PartnershipToPriceList" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_PartnershipToPriceList_AB_unique" ON "_PartnershipToPriceList"("A", "B");

-- CreateIndex
CREATE INDEX "_PartnershipToPriceList_B_index" ON "_PartnershipToPriceList"("B");

-- AddForeignKey
ALTER TABLE "_PartnershipToPriceList" ADD CONSTRAINT "_PartnershipToPriceList_A_fkey" FOREIGN KEY ("A") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PartnershipToPriceList" ADD CONSTRAINT "_PartnershipToPriceList_B_fkey" FOREIGN KEY ("B") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
