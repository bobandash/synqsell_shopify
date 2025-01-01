import db from "@db/test-db";
import { simpleFaker } from "@faker-js/faker";
import { PrismaClient, Prisma } from "@prisma/client";
type DbClient = PrismaClient | Prisma.TransactionClient;

export const generateStripeWebhook = async (
  overrides = {},
  ctx: DbClient = db
) => {
  const data = { id: simpleFaker.string.uuid() };
  return await ctx.stripeWebhook.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};
