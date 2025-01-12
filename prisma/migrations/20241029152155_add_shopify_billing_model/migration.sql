/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `StripeWebhook` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "Billing" (
    "id" TEXT NOT NULL,
    "shopifySubscriptionLineItemId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "Billing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StripeWebhook_id_key" ON "StripeWebhook"("id");

-- AddForeignKey
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
