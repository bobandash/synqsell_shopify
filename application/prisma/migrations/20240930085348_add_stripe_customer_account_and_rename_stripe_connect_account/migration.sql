/*
  Warnings:

  - You are about to drop the `StripeAccount` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "StripeAccount" DROP CONSTRAINT "StripeAccount_sessionId_fkey";

-- AlterTable
ALTER TABLE "UserProfile" ALTER COLUMN "currencyCode" DROP DEFAULT;

-- DropTable
DROP TABLE "StripeAccount";

-- CreateTable
CREATE TABLE "StripeConnectAccount" (
    "id" TEXT NOT NULL,
    "stripeAccountId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeConnectAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeCustomerAccount" (
    "id" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeMethodId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeCustomerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StripeConnectAccount_supplierId_key" ON "StripeConnectAccount"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeCustomerAccount_stripeCustomerId_key" ON "StripeCustomerAccount"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeCustomerAccount_stripeMethodId_key" ON "StripeCustomerAccount"("stripeMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeCustomerAccount_retailerId_key" ON "StripeCustomerAccount"("retailerId");

-- AddForeignKey
ALTER TABLE "StripeConnectAccount" ADD CONSTRAINT "StripeConnectAccount_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripeCustomerAccount" ADD CONSTRAINT "StripeCustomerAccount_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
