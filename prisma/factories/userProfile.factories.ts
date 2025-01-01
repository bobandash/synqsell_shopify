import {
  generateSocialMediaLinkData,
  generateUserProfileData,
} from "@db/fixtures";
import db from "@db/test-db";
import { PrismaClient, Prisma } from "@prisma/client";
type DbClient = PrismaClient | Prisma.TransactionClient;

export const generateUserProfile = async (
  sessionId: string,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generateUserProfileData(sessionId);
  return await ctx.userProfile.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateSocialMediaLink = async (
  userProfileId: string,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generateSocialMediaLinkData(userProfileId);
  return await ctx.socialMediaLink.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};
