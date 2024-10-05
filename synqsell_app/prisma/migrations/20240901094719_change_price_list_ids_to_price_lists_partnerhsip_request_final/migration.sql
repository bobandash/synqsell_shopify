/*
  Warnings:

  - Made the column `status` on table `PartnershipRequest` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "PartnershipRequest" ALTER COLUMN "status" SET NOT NULL;
