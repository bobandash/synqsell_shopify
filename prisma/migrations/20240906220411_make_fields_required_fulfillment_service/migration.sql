/*
  Warnings:

  - Made the column `shopifyFulfillmentServiceId` on table `FulfillmentService` required. This step will fail if there are existing NULL values in that column.
  - Made the column `shopifyLocationId` on table `FulfillmentService` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "FulfillmentService" ALTER COLUMN "shopifyFulfillmentServiceId" SET NOT NULL,
ALTER COLUMN "shopifyLocationId" SET NOT NULL;
