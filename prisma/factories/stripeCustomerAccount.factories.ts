import { generateStripeCustomerAccountData } from "@db/fixtures";
import db from "@db/test-db";
import { createTestSession } from "./session.factories";
import { Session, StripeCustomerAccount } from "@prisma/client";

export type TestStripeCustomerAccount = {
  session: Session;
  stripeCustomerAccount: StripeCustomerAccount;
};

export const generateStripeCustomerAccount = async (
  retailerId: string,
  hasPaymentMethod: boolean,
  overrides = {}
) => {
  const data = generateStripeCustomerAccountData(retailerId, hasPaymentMethod);
  return db.stripeCustomerAccount.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const createTestStripeCustomerAccount = async (
  hasPaymentMethod: boolean,
  overrides = {}
): Promise<TestStripeCustomerAccount> => {
  const session = await createTestSession();
  const stripeCustomerAccount = await generateStripeCustomerAccount(
    session.id,
    hasPaymentMethod,
    overrides
  );
  return { session, stripeCustomerAccount };
};
