/*
  Warnings:

  - You are about to drop the column `amount` on the `Payment` table. All the data in the column will be lost.
  - Added the required column `orderPaid` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingPaid` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalPaid` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "amount",
ADD COLUMN     "orderPaid" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "shippingPaid" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "totalPaid" DECIMAL(10,2) NOT NULL;
