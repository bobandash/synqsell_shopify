/*
  Warnings:

  - You are about to drop the column `fulfillmentServiceId` on the `FulfillmentService` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FulfillmentService" DROP COLUMN "fulfillmentServiceId",
ADD COLUMN     "shopifyFulfillmentServiceId" TEXT,
ADD COLUMN     "shopifyLocationid" TEXT;
