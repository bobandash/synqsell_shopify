import { generateFulfillmentData } from "@db/fixtures";
import db from "@db/test-db";

export const generateFulfillment = async (orderId: string, overrides = {}) => {
  const data = generateFulfillmentData(orderId);
  return db.fulfillment.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};
