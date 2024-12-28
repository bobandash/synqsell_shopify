/*
  Warnings:

  - You are about to drop the column `amtSold` on the `ImportedProduct` table. All the data in the column will be lost.
  - You are about to drop the column `isGeneric` on the `PriceList` table. All the data in the column will be lost.
  - Added the required column `isGeneral` to the `PriceList` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `PriceList` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ImportedProduct" DROP COLUMN "amtSold";

-- AlterTable
ALTER TABLE "PriceList" DROP COLUMN "isGeneric",
ADD COLUMN     "isGeneral" BOOLEAN NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ImportedProductTransaction" (
    "id" TEXT NOT NULL,
    "importedProductId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "fulfilledAt" TIMESTAMP(3) NOT NULL,
    "unitSales" INTEGER NOT NULL,

    CONSTRAINT "ImportedProductTransaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ImportedProductTransaction" ADD CONSTRAINT "ImportedProductTransaction_importedProductId_fkey" FOREIGN KEY ("importedProductId") REFERENCES "ImportedProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
