import db from "@db/test-db";
import { generateFulfillmentServiceData } from "@db/fixtures";
import { createTestSession } from "./session.factories";
import { FulfillmentService, Session } from "@prisma/client";
import { Prisma, PrismaClient } from "@prisma/client";
type DbClient = PrismaClient | Prisma.TransactionClient;

export type TestFulfillmentService = {
  session: Session;
  fulfillmentService: FulfillmentService;
};
export const generateFulfillmentService = async (
  sessionId: string,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generateFulfillmentServiceData(sessionId);
  return await ctx.fulfillmentService.create({
    data: {
      ...data,
      sessionId,
      ...overrides,
    },
  });
};
export const createTestFulfillmentService = async (
  overrides = {}
): Promise<TestFulfillmentService> => {
  const session = await createTestSession();
  const fulfillmentService = await generateFulfillmentService(
    session.id,
    overrides
  );
  return { session, fulfillmentService };
};
