/*
  Warnings:

  - Added the required column `temp` to the `ModelDefinition` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ModelDefinition" ADD COLUMN     "temp" TEXT NOT NULL;
