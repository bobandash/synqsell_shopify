/*
  Warnings:

  - Made the column `facebook` on table `SocialMediaLink` required. This step will fail if there are existing NULL values in that column.
  - Made the column `twitter` on table `SocialMediaLink` required. This step will fail if there are existing NULL values in that column.
  - Made the column `instagram` on table `SocialMediaLink` required. This step will fail if there are existing NULL values in that column.
  - Made the column `youtube` on table `SocialMediaLink` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tiktok` on table `SocialMediaLink` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "SocialMediaLink" ALTER COLUMN "facebook" SET NOT NULL,
ALTER COLUMN "facebook" SET DEFAULT '',
ALTER COLUMN "twitter" SET NOT NULL,
ALTER COLUMN "twitter" SET DEFAULT '',
ALTER COLUMN "instagram" SET NOT NULL,
ALTER COLUMN "instagram" SET DEFAULT '',
ALTER COLUMN "youtube" SET NOT NULL,
ALTER COLUMN "youtube" SET DEFAULT '',
ALTER COLUMN "tiktok" SET NOT NULL,
ALTER COLUMN "tiktok" SET DEFAULT '';
