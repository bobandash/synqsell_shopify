-- DropForeignKey
ALTER TABLE "CarrierService" DROP CONSTRAINT "CarrierService_retailerId_fkey";

-- DropForeignKey
ALTER TABLE "ChecklistStatus" DROP CONSTRAINT "ChecklistStatus_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "FulfillmentService" DROP CONSTRAINT "FulfillmentService_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "ImportedProduct" DROP CONSTRAINT "ImportedProduct_retailerId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_retailerId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "OrderLineItem" DROP CONSTRAINT "OrderLineItem_priceListId_fkey";

-- DropForeignKey
ALTER TABLE "Partnership" DROP CONSTRAINT "Partnership_retailerId_fkey";

-- DropForeignKey
ALTER TABLE "Partnership" DROP CONSTRAINT "Partnership_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "PartnershipRequest" DROP CONSTRAINT "PartnershipRequest_recipientId_fkey";

-- DropForeignKey
ALTER TABLE "PartnershipRequest" DROP CONSTRAINT "PartnershipRequest_senderId_fkey";

-- DropForeignKey
ALTER TABLE "PriceList" DROP CONSTRAINT "PriceList_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "SocialMediaLink" DROP CONSTRAINT "SocialMediaLink_userProfileId_fkey";

-- DropForeignKey
ALTER TABLE "StripeConnectAccount" DROP CONSTRAINT "StripeConnectAccount_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "StripeCustomerAccount" DROP CONSTRAINT "StripeCustomerAccount_retailerId_fkey";

-- DropForeignKey
ALTER TABLE "SupplierAccessRequest" DROP CONSTRAINT "SupplierAccessRequest_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "UserPreference" DROP CONSTRAINT "UserPreference_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "UserProfile" DROP CONSTRAINT "UserProfile_sessionId_fkey";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "retailerId" DROP NOT NULL,
ALTER COLUMN "supplierId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "OrderLineItem" ALTER COLUMN "priceListId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "FulfillmentService" ADD CONSTRAINT "FulfillmentService_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistStatus" ADD CONSTRAINT "ChecklistStatus_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierAccessRequest" ADD CONSTRAINT "SupplierAccessRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialMediaLink" ADD CONSTRAINT "SocialMediaLink_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceList" ADD CONSTRAINT "PriceList_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipRequest" ADD CONSTRAINT "PartnershipRequest_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipRequest" ADD CONSTRAINT "PartnershipRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partnership" ADD CONSTRAINT "Partnership_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partnership" ADD CONSTRAINT "Partnership_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedProduct" ADD CONSTRAINT "ImportedProduct_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarrierService" ADD CONSTRAINT "CarrierService_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLineItem" ADD CONSTRAINT "OrderLineItem_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripeConnectAccount" ADD CONSTRAINT "StripeConnectAccount_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripeCustomerAccount" ADD CONSTRAINT "StripeCustomerAccount_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
