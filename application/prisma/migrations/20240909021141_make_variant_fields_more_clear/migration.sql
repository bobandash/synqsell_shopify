/*
  Warnings:

  - You are about to drop the column `cost` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `profit` on the `Variant` table. All the data in the column will be lost.
  - Added the required column `retailerPayment` to the `Variant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supplierProfit` to the `Variant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Variant" DROP COLUMN "cost",
DROP COLUMN "profit",
ADD COLUMN     "retailerPayment" TEXT NOT NULL,
ADD COLUMN     "supplierProfit" TEXT NOT NULL;
