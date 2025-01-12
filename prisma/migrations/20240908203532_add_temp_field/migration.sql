/*
  Warnings:

  - Added the required column `test` to the `RateDefinition` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RateDefinition" ADD COLUMN     "test" TEXT NOT NULL;
