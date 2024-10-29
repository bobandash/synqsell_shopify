/*
  Warnings:

  - You are about to drop the column `shopifyRetailerFulfillmentOrderId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shopifySupplierOrderId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shopifyRetailerOrderLineItemId` on the `OrderLineItem` table. All the data in the column will be lost.
  - You are about to drop the column `shopifySupplierOrderLineItemId` on the `OrderLineItem` table. All the data in the column will be lost.
  - Added the required column `retailerShopifyFulfillmentOrderId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supplierShopifyOrderId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `retailerShopifyOrderLineItemId` to the `OrderLineItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supplierShopifyOrderLineItemId` to the `OrderLineItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "shopifyRetailerFulfillmentOrderId",
DROP COLUMN "shopifySupplierOrderId",
ADD COLUMN     "retailerShopifyFulfillmentOrderId" TEXT NOT NULL,
ADD COLUMN     "supplierShopifyOrderId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "OrderLineItem" DROP COLUMN "shopifyRetailerOrderLineItemId",
DROP COLUMN "shopifySupplierOrderLineItemId",
ADD COLUMN     "retailerShopifyOrderLineItemId" TEXT NOT NULL,
ADD COLUMN     "supplierShopifyOrderLineItemId" TEXT NOT NULL;
