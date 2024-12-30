import { createTestSession } from "./session.factories";
import { generateCarrierServiceData } from "@db/fixtures";
import db from "@db/test-db";
import { CarrierService, Session } from "@prisma/client";

export type TestCarrierService = {
  retailer: Session;
  carrierService: CarrierService;
};

export const generateCarrierService = async (
  retailerId: string,
  overrides = {}
) => {
  const data = generateCarrierServiceData(retailerId);
  return db.carrierService.create({
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
