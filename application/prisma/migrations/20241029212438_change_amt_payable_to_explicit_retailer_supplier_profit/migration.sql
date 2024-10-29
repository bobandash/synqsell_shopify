/*
  Warnings:

  - You are about to drop the column `amountPayablePerUnit` on the `OrderLineItem` table. All the data in the column will be lost.
  - Added the required column `retailerProfitPerUnit` to the `OrderLineItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supplierProfitPerUnit` to the `OrderLineItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrderLineItem" DROP COLUMN "amountPayablePerUnit",
ADD COLUMN     "retailerProfitPerUnit" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "supplierProfitPerUnit" DECIMAL(10,2) NOT NULL;
