import { createTestSession } from "./session.factories";
import { generateBillingData } from "@db/fixtures";
import db from "@db/test-db";
import { Billing, Prisma, PrismaClient, Session } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type TestBilling = {
  session: Session;
  billing: Billing;
};

export const generateBilling = async (
  sessionId: string,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generateBillingData(sessionId);
  return await ctx.billing.create({
    data: {
      ...data,
      sessionId,
      ...overrides,
    },
  });
};

export const createTestBilling = async (
  overrides = {}
): Promise<TestBilling> => {
  const session = await createTestSession();
  const billing = await generateBilling(session.id, overrides);
  return { session, billing };
};
