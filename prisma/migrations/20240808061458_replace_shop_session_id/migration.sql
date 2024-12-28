/*
  Warnings:

  - You are about to drop the column `shop` on the `ChecklistStatus` table. All the data in the column will be lost.
  - You are about to drop the column `shop` on the `FulfillmentService` table. All the data in the column will be lost.
  - You are about to drop the column `shop` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `shop` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `shop` on the `UserPreference` table. All the data in the column will be lost.
  - Added the required column `sessionId` to the `ChecklistStatus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fulfillmentServiceId` to the `FulfillmentService` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionId` to the `FulfillmentService` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionId` to the `Profile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionId` to the `Role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionId` to the `UserPreference` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ChecklistStatus" DROP COLUMN "shop",
ADD COLUMN     "sessionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FulfillmentService" DROP COLUMN "shop",
ADD COLUMN     "fulfillmentServiceId" TEXT NOT NULL,
ADD COLUMN     "sessionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "shop",
ADD COLUMN     "sessionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "shop",
ADD COLUMN     "sessionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UserPreference" DROP COLUMN "shop",
ADD COLUMN     "sessionId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "FulfillmentService" ADD CONSTRAINT "FulfillmentService_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistStatus" ADD CONSTRAINT "ChecklistStatus_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
