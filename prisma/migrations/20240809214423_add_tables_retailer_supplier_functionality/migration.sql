-- CreateTable
CREATE TABLE "PriceList" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isGeneric" BOOLEAN NOT NULL,
    "pricingStrategy" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,

    CONSTRAINT "PriceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceListRetailer" (
    "id" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,

    CONSTRAINT "PriceListRetailer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "images" TEXT[],
    "description" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "wholesalePrice" INTEGER,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportedProduct" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "amtSold" INTEGER NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportedProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partnership" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,

    CONSTRAINT "Partnership_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PriceList" ADD CONSTRAINT "PriceList_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListRetailer" ADD CONSTRAINT "PriceListRetailer_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListRetailer" ADD CONSTRAINT "PriceListRetailer_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedProduct" ADD CONSTRAINT "ImportedProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedProduct" ADD CONSTRAINT "ImportedProduct_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partnership" ADD CONSTRAINT "Partnership_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partnership" ADD CONSTRAINT "Partnership_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
