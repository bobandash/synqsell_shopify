-- DropForeignKey
ALTER TABLE "Billing" DROP CONSTRAINT "Billing_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "BillingTransaction" DROP CONSTRAINT "BillingTransaction_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "BillingTransaction" DROP CONSTRAINT "BillingTransaction_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "ChecklistItem" DROP CONSTRAINT "ChecklistItem_checklistTableId_fkey";

-- DropForeignKey
ALTER TABLE "Fulfillment" DROP CONSTRAINT "Fulfillment_orderId_fkey";

-- DropForeignKey
ALTER TABLE "OrderLineItem" DROP CONSTRAINT "OrderLineItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_fulfillmentId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_orderId_fkey";

-- DropForeignKey
ALTER TABLE "SupplierAccessRequest" DROP CONSTRAINT "SupplierAccessRequest_checklistStatusId_fkey";

-- AlterTable
ALTER TABLE "BillingTransaction" ALTER COLUMN "sessionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SupplierAccessRequest" ALTER COLUMN "checklistStatusId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistTableId_fkey" FOREIGN KEY ("checklistTableId") REFERENCES "ChecklistTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierAccessRequest" ADD CONSTRAINT "SupplierAccessRequest_checklistStatusId_fkey" FOREIGN KEY ("checklistStatusId") REFERENCES "ChecklistStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLineItem" ADD CONSTRAINT "OrderLineItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fulfillment" ADD CONSTRAINT "Fulfillment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "Fulfillment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingTransaction" ADD CONSTRAINT "BillingTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingTransaction" ADD CONSTRAINT "BillingTransaction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
