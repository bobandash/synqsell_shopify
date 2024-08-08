/*
  Warnings:

  - A unique constraint covering the columns `[sessionId]` on the table `FulfillmentService` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sessionId]` on the table `Profile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sessionId]` on the table `UserPreference` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "FulfillmentService_sessionId_key" ON "FulfillmentService"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_sessionId_key" ON "Profile"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_sessionId_key" ON "UserPreference"("sessionId");
