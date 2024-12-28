/*
  Warnings:

  - A unique constraint covering the columns `[fulfillmentId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fulfillmentId` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "fulfillmentId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_fulfillmentId_key" ON "Payment"("fulfillmentId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "Fulfillment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
