import { generateSessionData } from "@db/fixtures";
import db from "@db/test-db";
import type { PrismaClient, Prisma } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

export const createTestSession = async (overrides = {}, ctx: DbClient = db) => {
  const data = generateSessionData();
  return await ctx.session.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};
