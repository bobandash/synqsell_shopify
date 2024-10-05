/*
  Warnings:

  - You are about to drop the column `stripePaymentMethodId` on the `StripeCustomerAccount` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "StripeCustomerAccount_stripePaymentMethodId_key";

-- AlterTable
ALTER TABLE "StripeCustomerAccount" DROP COLUMN "stripePaymentMethodId";
