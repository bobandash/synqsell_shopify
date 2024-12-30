import { createTestSession } from "./session.factories";
import { generateBillingData } from "@db/fixtures";
import db from "@db/test-db";
import { Billing, Session } from "@prisma/client";

export type TestBilling = {
  session: Session;
  billing: Billing;
};

export const generateBilling = async (sessionId: string, overrides = {}) => {
  const data = generateBillingData(sessionId);
  return db.billing.create({
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
