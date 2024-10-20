/*
  Warnings:

  - You are about to drop the column `productId` on the `ImportedProduct` table. All the data in the column will be lost.
  - Added the required column `prismaProductId` to the `ImportedProduct` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shopifyProductId` to the `ImportedProduct` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ImportedProduct" DROP CONSTRAINT "ImportedProduct_productId_fkey";

-- AlterTable
ALTER TABLE "ImportedProduct" DROP COLUMN "productId",
ADD COLUMN     "prismaProductId" TEXT NOT NULL,
ADD COLUMN     "shopifyProductId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "ShippingProfile" (
    "id" TEXT NOT NULL,
    "shopifyProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,

    CONSTRAINT "ShippingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationGroup" (
    "id" TEXT NOT NULL,
    "shopifyLocationId" TEXT NOT NULL,
    "shippingProfileId" TEXT NOT NULL,

    CONSTRAINT "LocationGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shopifyZoneId" TEXT NOT NULL,
    "locationGroupId" TEXT NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelDefinition" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,

    CONSTRAINT "ModelDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateDefinition" (
    "id" TEXT NOT NULL,
    "shopifyRateDefinitionId" TEXT NOT NULL,
    "priceAmount" TEXT NOT NULL,
    "priceCurrencyCode" TEXT NOT NULL,
    "modelDefinitionId" TEXT NOT NULL,

    CONSTRAINT "RateDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "code" CHAR(2) NOT NULL,
    "includeAllProvinces" BOOLEAN NOT NULL,
    "restOfWorld" BOOLEAN NOT NULL,
    "zoneId" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Province" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,

    CONSTRAINT "Province_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportedVariant" (
    "id" TEXT NOT NULL,
    "importedProductId" TEXT NOT NULL,
    "prismaVariantId" TEXT NOT NULL,

    CONSTRAINT "ImportedVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShippingProfile_supplierId_key" ON "ShippingProfile"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "RateDefinition_modelDefinitionId_key" ON "RateDefinition"("modelDefinitionId");

-- AddForeignKey
ALTER TABLE "ShippingProfile" ADD CONSTRAINT "ShippingProfile_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationGroup" ADD CONSTRAINT "LocationGroup_shippingProfileId_fkey" FOREIGN KEY ("shippingProfileId") REFERENCES "ShippingProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_locationGroupId_fkey" FOREIGN KEY ("locationGroupId") REFERENCES "LocationGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelDefinition" ADD CONSTRAINT "ModelDefinition_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateDefinition" ADD CONSTRAINT "RateDefinition_modelDefinitionId_fkey" FOREIGN KEY ("modelDefinitionId") REFERENCES "ModelDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Country" ADD CONSTRAINT "Country_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Province" ADD CONSTRAINT "Province_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedProduct" ADD CONSTRAINT "ImportedProduct_prismaProductId_fkey" FOREIGN KEY ("prismaProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedVariant" ADD CONSTRAINT "ImportedVariant_prismaVariantId_fkey" FOREIGN KEY ("prismaVariantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedVariant" ADD CONSTRAINT "ImportedVariant_importedProductId_fkey" FOREIGN KEY ("importedProductId") REFERENCES "ImportedProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
