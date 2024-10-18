/*
  Warnings:

  - You are about to drop the column `stripeMethodId` on the `StripeCustomerAccount` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripeAccountId]` on the table `StripeConnectAccount` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripePaymentMethodId]` on the table `StripeCustomerAccount` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `stripePaymentMethodId` to the `StripeCustomerAccount` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "StripeCustomerAccount_stripeMethodId_key";

-- AlterTable
ALTER TABLE "StripeCustomerAccount" DROP COLUMN "stripeMethodId",
ADD COLUMN     "stripePaymentMethodId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "StripeConnectAccount_stripeAccountId_key" ON "StripeConnectAccount"("stripeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeCustomerAccount_stripePaymentMethodId_key" ON "StripeCustomerAccount"("stripePaymentMethodId");
