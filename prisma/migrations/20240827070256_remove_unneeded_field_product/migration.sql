/*
  Warnings:

  - You are about to drop the column `price` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `wholesalePrice` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "price",
DROP COLUMN "wholesalePrice";
