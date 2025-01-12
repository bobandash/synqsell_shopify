-- CreateTable
CREATE TABLE "Fulfillment" (
    "id" TEXT NOT NULL,
    "supplierShopifyFulfillmentId" TEXT NOT NULL,
    "retailerShopifyFulfillmentId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,

    CONSTRAINT "Fulfillment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Fulfillment" ADD CONSTRAINT "Fulfillment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
