-- AlterTable
ALTER TABLE "ImportedVariant" ADD COLUMN     "deliveryProfileId" TEXT;

-- CreateTable
CREATE TABLE "DeliveryProfile" (
    "id" TEXT NOT NULL,
    "supplierShopifyDeliveryProfileId" TEXT NOT NULL,
    "retailerShopifyDeliveryProfileId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,

    CONSTRAINT "DeliveryProfile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ImportedVariant" ADD CONSTRAINT "ImportedVariant_deliveryProfileId_fkey" FOREIGN KEY ("deliveryProfileId") REFERENCES "DeliveryProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryProfile" ADD CONSTRAINT "DeliveryProfile_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
