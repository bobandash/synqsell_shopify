import db from "@db/test-db";
import { simpleFaker } from "@faker-js/faker";

export const generateStripeWebhook = async (overrides = {}) => {
  const data = { id: simpleFaker.string.uuid() };
  return db.stripeWebhook.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};
