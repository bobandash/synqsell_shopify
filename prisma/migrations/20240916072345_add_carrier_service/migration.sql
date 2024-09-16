/*
  Warnings:

  - You are about to drop the column `deliveryProfileId` on the `ImportedVariant` table. All the data in the column will be lost.
  - You are about to drop the `DeliveryProfile` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DeliveryProfile" DROP CONSTRAINT "DeliveryProfile_retailerId_fkey";

-- DropForeignKey
ALTER TABLE "ImportedVariant" DROP CONSTRAINT "ImportedVariant_deliveryProfileId_fkey";

-- AlterTable
ALTER TABLE "ImportedVariant" DROP COLUMN "deliveryProfileId";

-- DropTable
DROP TABLE "DeliveryProfile";

-- CreateTable
CREATE TABLE "CarrierService" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "shopifyCarrierServiceId" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CarrierService_retailerId_key" ON "CarrierService"("retailerId");

-- AddForeignKey
ALTER TABLE "CarrierService" ADD CONSTRAINT "CarrierService_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
