/*
  Warnings:

  - You are about to drop the column `countryCodeOfOrigin` on the `InventoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `harmonizedSystemCode` on the `InventoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `provinceCodeOfOrigin` on the `InventoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `requiresShipping` on the `InventoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `InventoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `tracked` on the `InventoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `weightUnit` on the `InventoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `weightValue` on the `InventoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `categoryId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `descriptionHtml` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `productType` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `variantsCount` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `vendor` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `barcode` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `compareAtPrice` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `inventoryPolicy` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `inventoryQuantity` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `taxCode` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `taxable` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `wholesalePrice` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the `Country` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Image` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LocationGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ModelDefinition` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Province` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RateDefinition` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShippingProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VariantOption` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Zone` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `shopifyInventoryItemId` to the `InventoryItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cost` to the `Variant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profit` to the `Variant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `retailPrice` to the `Variant` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Country" DROP CONSTRAINT "Country_zoneId_fkey";

-- DropForeignKey
ALTER TABLE "Image" DROP CONSTRAINT "Image_productId_fkey";

-- DropForeignKey
ALTER TABLE "LocationGroup" DROP CONSTRAINT "LocationGroup_shippingProfileId_fkey";

-- DropForeignKey
ALTER TABLE "ModelDefinition" DROP CONSTRAINT "ModelDefinition_zoneId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_priceListId_fkey";

-- DropForeignKey
ALTER TABLE "Province" DROP CONSTRAINT "Province_countryId_fkey";

-- DropForeignKey
ALTER TABLE "RateDefinition" DROP CONSTRAINT "RateDefinition_modelDefinitionId_fkey";

-- DropForeignKey
ALTER TABLE "ShippingProfile" DROP CONSTRAINT "ShippingProfile_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "VariantOption" DROP CONSTRAINT "VariantOption_variantId_fkey";

-- DropForeignKey
ALTER TABLE "Zone" DROP CONSTRAINT "Zone_locationGroupId_fkey";

-- AlterTable
ALTER TABLE "InventoryItem" DROP COLUMN "countryCodeOfOrigin",
DROP COLUMN "harmonizedSystemCode",
DROP COLUMN "provinceCodeOfOrigin",
DROP COLUMN "requiresShipping",
DROP COLUMN "sku",
DROP COLUMN "tracked",
DROP COLUMN "weightUnit",
DROP COLUMN "weightValue",
ADD COLUMN     "shopifyInventoryItemId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "categoryId",
DROP COLUMN "description",
DROP COLUMN "descriptionHtml",
DROP COLUMN "productType",
DROP COLUMN "status",
DROP COLUMN "title",
DROP COLUMN "variantsCount",
DROP COLUMN "vendor";

-- AlterTable
ALTER TABLE "Variant" DROP COLUMN "barcode",
DROP COLUMN "compareAtPrice",
DROP COLUMN "inventoryPolicy",
DROP COLUMN "inventoryQuantity",
DROP COLUMN "price",
DROP COLUMN "taxCode",
DROP COLUMN "taxable",
DROP COLUMN "wholesalePrice",
ADD COLUMN     "cost" TEXT NOT NULL,
ADD COLUMN     "profit" TEXT NOT NULL,
ADD COLUMN     "retailPrice" TEXT NOT NULL;

-- DropTable
DROP TABLE "Country";

-- DropTable
DROP TABLE "Image";

-- DropTable
DROP TABLE "LocationGroup";

-- DropTable
DROP TABLE "ModelDefinition";

-- DropTable
DROP TABLE "Province";

-- DropTable
DROP TABLE "RateDefinition";

-- DropTable
DROP TABLE "ShippingProfile";

-- DropTable
DROP TABLE "VariantOption";

-- DropTable
DROP TABLE "Zone";

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
