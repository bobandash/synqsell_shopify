/*
  Warnings:

  - You are about to drop the column `productId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `variantId` on the `Variant` table. All the data in the column will be lost.
  - Added the required column `shopifyProductId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shopifyVariantId` to the `Variant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "productId",
ADD COLUMN     "shopifyProductId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Variant" DROP COLUMN "variantId",
ADD COLUMN     "shopifyVariantId" TEXT NOT NULL;
