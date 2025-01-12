/*
  Warnings:

  - You are about to drop the `FulfilmentService` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "FulfilmentService";

-- CreateTable
CREATE TABLE "FulfillmentService" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,

    CONSTRAINT "FulfillmentService_pkey" PRIMARY KEY ("id")
);
