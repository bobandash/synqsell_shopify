/*
  Warnings:

  - The `wholesalePrice` column on the `Variant` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Variant" DROP COLUMN "wholesalePrice",
ADD COLUMN     "wholesalePrice" INTEGER;
