/*
  Warnings:

  - You are about to drop the column `shopifyVariantId` on the `OrderLineItem` table. All the data in the column will be lost.
  - Added the required column `retailerShopifyVariantId` to the `OrderLineItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supplierShopifyVariantId` to the `OrderLineItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrderLineItem" DROP COLUMN "shopifyVariantId",
ADD COLUMN     "retailerShopifyVariantId" TEXT NOT NULL,
ADD COLUMN     "supplierShopifyVariantId" TEXT NOT NULL;
