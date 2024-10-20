-- AlterTable
ALTER TABLE "Role" ALTER COLUMN "isVisibleInNetwork" SET DEFAULT true;

-- CreateTable
CREATE TABLE "SupplierAccessRequest" (
    "id" TEXT NOT NULL,
    "checklistStatusId" TEXT NOT NULL,
    "hasMetSalesThreshold" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "SupplierAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplierAccessRequest_checklistStatusId_key" ON "SupplierAccessRequest"("checklistStatusId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierAccessRequest_sessionId_key" ON "SupplierAccessRequest"("sessionId");

-- AddForeignKey
ALTER TABLE "SupplierAccessRequest" ADD CONSTRAINT "SupplierAccessRequest_checklistStatusId_fkey" FOREIGN KEY ("checklistStatusId") REFERENCES "ChecklistStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierAccessRequest" ADD CONSTRAINT "SupplierAccessRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
