/*
  Warnings:

  - You are about to drop the column `shopifyLocationid` on the `FulfillmentService` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FulfillmentService" DROP COLUMN "shopifyLocationid",
ADD COLUMN     "shopifyLocationId" TEXT;
