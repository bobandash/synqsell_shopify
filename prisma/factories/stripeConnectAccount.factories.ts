import { generateStripeConnectAccountData } from "@db/fixtures";
import db from "@db/test-db";
import { createTestSession } from "./session.factories";
import { Session, StripeConnectAccount } from "@prisma/client";

export type TestStripeConnectAccount = {
  session: Session;
  stripeConnectAccount: StripeConnectAccount;
};

export const generateStripeConnectAccount = async (
  supplierId: string,
  overrides = {}
) => {
  const data = generateStripeConnectAccountData(supplierId);
  return db.stripeConnectAccount.create({
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
