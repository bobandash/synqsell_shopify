-- CreateTable
CREATE TABLE "Variant" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "compareAtPrice" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "inventoryPolicy" TEXT NOT NULL,
    "inventoryQuantity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "taxCode" TEXT NOT NULL,
    "taxable" BOOLEAN NOT NULL,

    CONSTRAINT "Variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "cost" TEXT NOT NULL,
    "countryCodeOfOrigin" TEXT NOT NULL,
    "harmonizedSystemCode" TEXT NOT NULL,
    "weightUnit" TEXT NOT NULL,
    "weightValue" INTEGER NOT NULL,
    "provinceCodeOfOrigin" TEXT NOT NULL,
    "requiresShipping" BOOLEAN NOT NULL,
    "sku" TEXT NOT NULL,
    "tracked" BOOLEAN NOT NULL,
    "variantId" TEXT NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,

    CONSTRAINT "VariantOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_variantId_key" ON "InventoryItem"("variantId");

-- AddForeignKey
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantOption" ADD CONSTRAINT "VariantOption_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
