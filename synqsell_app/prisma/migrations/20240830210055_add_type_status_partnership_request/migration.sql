/*
  Warnings:

  - Added the required column `status` to the `PartnershipRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `PartnershipRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PartnershipRequest" ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL;
