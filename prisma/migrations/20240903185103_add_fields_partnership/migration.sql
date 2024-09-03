/*
  Warnings:

  - Added the required column `message` to the `Partnership` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Partnership" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "message" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PriceList" ADD COLUMN     "partnershipId" TEXT;

-- AddForeignKey
ALTER TABLE "PriceList" ADD CONSTRAINT "PriceList_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
