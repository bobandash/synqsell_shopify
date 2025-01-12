/*
  Warnings:

  - You are about to drop the column `cost` on the `InventoryItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InventoryItem" DROP COLUMN "cost",
ALTER COLUMN "countryCodeOfOrigin" DROP NOT NULL,
ALTER COLUMN "harmonizedSystemCode" DROP NOT NULL,
ALTER COLUMN "weightUnit" DROP NOT NULL,
ALTER COLUMN "weightValue" DROP NOT NULL,
ALTER COLUMN "provinceCodeOfOrigin" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Variant" ALTER COLUMN "inventoryQuantity" DROP NOT NULL,
ALTER COLUMN "taxCode" DROP NOT NULL;
