/*
  Warnings:

  - Added the required column `temp` to the `Partnership` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Partnership" ADD COLUMN     "temp" TEXT NOT NULL;
