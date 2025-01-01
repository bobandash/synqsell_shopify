import { generateStripeConnectAccountData } from "@db/fixtures";
import db from "@db/test-db";
import { createTestSession } from "./session.factories";
import {
  Session,
  StripeConnectAccount,
  Prisma,
  PrismaClient,
} from "@prisma/client";
type DbClient = PrismaClient | Prisma.TransactionClient;

export type TestStripeConnectAccount = {
  session: Session;
  stripeConnectAccount: StripeConnectAccount;
};

export const generateStripeConnectAccount = async (
  supplierId: string,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generateStripeConnectAccountData(supplierId);
  return await ctx.stripeConnectAccount.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const createTestStripeConnectAccount = async (
  overrides = {}
): Promise<TestStripeConnectAccount> => {
  const session = await createTestSession();
  const stripeConnectAccount = await generateStripeConnectAccount(
    session.id,
    overrides
  );
  return { session, stripeConnectAccount };
};
