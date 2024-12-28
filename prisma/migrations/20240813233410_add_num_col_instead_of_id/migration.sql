/*
  Warnings:

  - The primary key for the `SupplierAccessRequest` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "SupplierAccessRequest" DROP CONSTRAINT "SupplierAccessRequest_pkey",
ADD COLUMN     "num" SERIAL NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "SupplierAccessRequest_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "SupplierAccessRequest_id_seq";
