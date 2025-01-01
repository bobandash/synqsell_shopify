import { createTestSession } from "./session.factories";
import { generateCarrierServiceData } from "@db/fixtures";
import db from "@db/test-db";
import { PrismaClient, Prisma, CarrierService, Session } from "@prisma/client";
type DbClient = PrismaClient | Prisma.TransactionClient;

export type TestCarrierService = {
  retailer: Session;
  carrierService: CarrierService;
};

export const generateCarrierService = async (
  retailerId: string,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generateCarrierServiceData(retailerId);
  return await ctx.carrierService.create({
    data: {
      ...data,
      retailerId,
      ...overrides,
    },
  });
};

export const createTestCarrierService = async (
  overrides = {}
): Promise<TestCarrierService> => {
  const retailer = await createTestSession();
  const carrierService = await generateCarrierService(retailer.id, overrides);
  return { retailer, carrierService };
};
