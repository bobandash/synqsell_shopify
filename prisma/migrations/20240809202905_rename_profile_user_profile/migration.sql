/*
  Warnings:

  - You are about to drop the `Profile` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_sessionId_fkey";

-- DropTable
DROP TABLE "Profile";

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "logo" TEXT,
    "biography" TEXT,
    "desiredProducts" TEXT,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_sessionId_key" ON "UserProfile"("sessionId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
