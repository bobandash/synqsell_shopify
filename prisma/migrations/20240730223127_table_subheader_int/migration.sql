/*
  Warnings:

  - You are about to drop the column `subHeader` on the `ChecklistTable` table. All the data in the column will be lost.
  - Added the required column `subheader` to the `ChecklistTable` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ChecklistTable" DROP COLUMN "subHeader",
ADD COLUMN     "subheader" INTEGER NOT NULL;
